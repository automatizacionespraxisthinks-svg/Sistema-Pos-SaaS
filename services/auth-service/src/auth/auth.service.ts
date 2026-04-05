import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto, RegisterDto, RefreshTokenDto, UpdateUserDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private readonly rtRepo: Repository<RefreshToken>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (await this.userRepo.findOne({ where: { email: dto.email } }))
      throw new ConflictException('Email already registered');
    const user = this.userRepo.create({ ...dto, password: await bcrypt.hash(dto.password, 12) });
    await this.userRepo.save(user);
    return this.tokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.password)))
      throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account deactivated');
    return this.tokens(user);
  }

  async refresh(token: string) {
    const rt = await this.rtRepo.findOne({ where: { token, isRevoked: false }, relations: ['user'] });
    if (!rt || rt.expiresAt < new Date()) throw new UnauthorizedException('Invalid refresh token');
    rt.isRevoked = true;
    await this.rtRepo.save(rt);
    return this.tokens(rt.user);
  }

  async logout(userId: string) {
    await this.rtRepo.update({ userId }, { isRevoked: true });
    return { message: 'Logged out' };
  }

  async validateToken(token: string) {
    try {
      const p = this.jwt.verify(token);
      const user = await this.userRepo.findOne({ where: { id: p.sub } });
      return (user && user.isActive) ? p : null;
    } catch { return null; }
  }

  async createUser(tenantId: string, dto: RegisterDto) {
    if (await this.userRepo.findOne({ where: { email: dto.email } }))
      throw new ConflictException('Email already registered');
    const user = this.userRepo.create({
      ...dto,
      tenantId,
      password: await bcrypt.hash(dto.password, 12),
    });
    await this.userRepo.save(user);
    const { password, ...result } = user as any;
    return result;
  }

  async getUsersByRole(tenantId: string, role?: string) {
    const where: any = { tenantId };
    if (role) where.role = role;
    const users = await this.userRepo.find({
      where,
      select: ['id', 'firstName', 'lastName', 'role', 'email', 'isActive'],
      order: { firstName: 'ASC' },
    });
    return users;
  }

  async updateUser(tenantId: string, id: string, dto: UpdateUserDto) {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    if (dto.firstName  !== undefined) user.firstName = dto.firstName;
    if (dto.lastName   !== undefined) user.lastName  = dto.lastName;
    if (dto.role       !== undefined) user.role      = dto.role;
    if (dto.isActive   !== undefined) user.isActive  = dto.isActive;
    await this.userRepo.save(user);
    const { password, ...result } = user as any;
    return result;
  }

  async deleteUser(tenantId: string, id: string) {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    user.isActive = false;
    await this.userRepo.save(user);
    return { message: 'User deactivated' };
  }

  private async tokens(user: User) {
    const p = { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId };
    const accessToken = this.jwt.sign(p, { expiresIn: '15m' });
    const refreshToken = this.jwt.sign(p, { expiresIn: '7d' });
    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 7);
    await this.rtRepo.save(this.rtRepo.create({ token: refreshToken, userId: user.id, expiresAt }));
    return { accessToken, refreshToken, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, tenantId: user.tenantId } };
  }
}
