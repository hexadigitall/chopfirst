import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join('; ')
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export const schemas = {
  login: z.object({
    credential: z.string().min(1, 'Phone/email is required'),
    password: z.string().min(1, 'Password is required'),
  }),

  demologin: z.object({
    userId: z.string().min(1, 'User ID is required'),
  }),

  createUser: z.object({
    name: z.string().min(1, 'Name is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().optional(),
    email: z.string().email('Invalid email format').optional(),
  }).refine(d => d.phone || d.email, { message: 'Phone or email is required' }),

  pay: z.object({
    amount: z.number().positive('Amount must be positive'),
  }),

  createOrder: z.object({
    merchantId: z.string().min(1, 'Merchant ID is required'),
    items: z.array(z.object({
      menuItemId: z.string().min(1, 'Menu item ID is required'),
      quantity: z.number().int().positive('Quantity must be at least 1').default(1),
    })).min(1, 'At least one item is required'),
    downPayment: z.number().nonnegative('Down payment must be non-negative'),
  }),

  orderPay: z.object({
    amount: z.number().positive('Amount must be positive'),
  }),

  adminCredit: z.object({
    amount: z.number().positive('Amount must be positive'),
  }),
};
