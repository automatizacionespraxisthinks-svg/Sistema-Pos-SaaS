import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface RecipeIngredient {
  ingredientId:   string;
  ingredientName: string;
  quantity:       number;
  unit:           string;
}

@Entity('recipes')
export class Recipe {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() tenantId:    string;
  @Column() productId:   string;
  @Column() productName: string;

  /** Lista de ingredientes con su cantidad por unidad del producto */
  @Column({ type: 'jsonb' }) ingredients: RecipeIngredient[];

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
