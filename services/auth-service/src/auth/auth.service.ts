import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Tenant } from './entities/tenant.entity';
import { LoginDto, RegisterDto, UpdateUserDto, CreateUserDto, UpdateTenantDto } from './dto/auth.dto';
import { auditLog } from './audit-client';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private readonly rtRepo: Repository<RefreshToken>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    private readonly jwt: JwtService,
  ) {}

  // ── Tenant registration (creates new business + owner account) ────────────

  async register(dto: RegisterDto) {
    if (await this.tenantRepo.findOne({ where: { slug: dto.slug } }))
      throw new ConflictException('Este código de negocio ya está en uso');
    if (await this.userRepo.findOne({ where: { email: dto.email } }))
      throw new ConflictException('Este correo ya está registrado');

    const tenant = this.tenantRepo.create({ slug: dto.slug, name: dto.businessName });
    await this.tenantRepo.save(tenant);

    const user = this.userRepo.create({
      email:     dto.email,
      password:  await bcrypt.hash(dto.password, 12),
      firstName: dto.firstName,
      lastName:  dto.lastName,
      tenantId:  tenant.id,
      role:      UserRole.ADMIN,
    });
    await this.userRepo.save(user);

    auditLog({
      tenantId: tenant.id,
      userId:   user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      module:   'auth',
      action:   'REGISTER_TENANT',
      entityId: tenant.id,
      entityType: 'Tenant',
      newValue: { slug: tenant.slug, name: tenant.name, adminEmail: dto.email },
      description: `Nuevo negocio registrado: ${tenant.name} (${tenant.slug})`,
    });

    return this.tokens(user);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const tenant = await this.tenantRepo.findOne({ where: { slug: dto.slug, isActive: true } });
    if (!tenant) throw new UnauthorizedException('Negocio no encontrado');

    const user = await this.userRepo.findOne({ where: { email: dto.email, tenantId: tenant.id } });
    if (!user || !(await bcrypt.compare(dto.password, user.password)))
      throw new UnauthorizedException('Credenciales inválidas');
    if (!user.isActive) throw new UnauthorizedException('Cuenta desactivada');

    auditLog({
      tenantId: tenant.id,
      userId:   user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      module:   'auth',
      action:   'LOGIN',
      entityId: user.id,
      entityType: 'User',
      description: `Inicio de sesión: ${user.email} (${user.role})`,
    });

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

  // ── Users ─────────────────────────────────────────────────────────────────

  async createUser(tenantId: string, dto: CreateUserDto, actorId?: string, actorRole?: string) {
    if (await this.userRepo.findOne({ where: { email: dto.email } }))
      throw new ConflictException('Email already registered');
    const user = this.userRepo.create({
      ...dto,
      tenantId,
      password: await bcrypt.hash(dto.password, 12),
    });
    await this.userRepo.save(user);
    const { password, ...result } = user as any;

    auditLog({
      tenantId,
      userId:   actorId,
      userRole: actorRole,
      module:   'users',
      action:   'CREATE_USER',
      entityId: user.id,
      entityType: 'User',
      newValue: { email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      description: `Usuario creado: ${user.email} con rol ${user.role}`,
    });

    return result;
  }

  async getUsersByRole(tenantId: string, role?: string) {
    const where: any = { tenantId };
    if (role) where.role = role;
    return this.userRepo.find({
      where,
      select: ['id', 'firstName', 'lastName', 'role', 'email', 'isActive'],
      order: { firstName: 'ASC' },
    });
  }

  async updateUser(tenantId: string, id: string, dto: UpdateUserDto, actorId?: string, actorRole?: string) {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');

    const prev = { role: user.role, isActive: user.isActive, firstName: user.firstName, lastName: user.lastName };

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName  !== undefined) user.lastName  = dto.lastName;
    if (dto.role      !== undefined) user.role      = dto.role;
    if (dto.isActive  !== undefined) user.isActive  = dto.isActive;
    await this.userRepo.save(user);
    const { password, ...result } = user as any;

    auditLog({
      tenantId,
      userId:   actorId,
      userRole: actorRole,
      module:   'users',
      action:   'UPDATE_USER',
      entityId: user.id,
      entityType: 'User',
      previousValue: prev,
      newValue: { role: user.role, isActive: user.isActive, firstName: user.firstName, lastName: user.lastName },
      description: `Usuario actualizado: ${user.email}`,
    });

    return result;
  }

  async deleteUser(tenantId: string, id: string, actorId?: string, actorRole?: string) {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('User not found');
    const wasActive = user.isActive;
    user.isActive = false;
    await this.userRepo.save(user);

    auditLog({
      tenantId,
      userId:   actorId,
      userRole: actorRole,
      module:   'users',
      action:   'DEACTIVATE_USER',
      entityId: user.id,
      entityType: 'User',
      previousValue: { isActive: wasActive },
      newValue:      { isActive: false },
      description: `Usuario desactivado: ${user.email}`,
    });

    return { message: 'User deactivated' };
  }

  // ── Tenant ────────────────────────────────────────────────────────────────

  async getTenant(tenantId: string) {
    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!t) throw new NotFoundException('Tenant not found');
    return t;
  }

  async getTenantPublic(slug: string) {
    const t = await this.tenantRepo.findOne({ where: { slug, isActive: true }, select: ['name', 'slug', 'logoUrl', 'primaryColor'] });
    if (!t) throw new NotFoundException('Negocio no encontrado');
    return t;
  }

  async updateTenant(tenantId: string, dto: UpdateTenantDto, actorId?: string, actorRole?: string) {
    const t = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!t) throw new NotFoundException('Tenant not found');

    const prev = { name: t.name, phone: t.phone, address: t.address, primaryColor: t.primaryColor };
    Object.assign(t, dto);
    const saved = await this.tenantRepo.save(t);

    auditLog({
      tenantId,
      userId:   actorId,
      userRole: actorRole,
      module:   'tenant',
      action:   'UPDATE_TENANT',
      entityId: tenantId,
      entityType: 'Tenant',
      previousValue: prev,
      newValue: dto,
      description: `Configuración del negocio actualizada`,
    });

    return saved;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async tokens(user: User) {
    const p = { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId };
    const accessToken  = this.jwt.sign(p, { expiresIn: '15m' });
    const refreshToken = this.jwt.sign(p, { expiresIn: '7d' });
    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 7);
    await this.rtRepo.save(this.rtRepo.create({ token: refreshToken, userId: user.id, expiresAt }));
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, tenantId: user.tenantId },
    };
  }
}
