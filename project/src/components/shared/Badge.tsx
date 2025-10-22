import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

export default function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  const variantStyles = {
    default: 'bg-secondary-100 text-secondary-700 ring-1 ring-inset ring-secondary-300',
    success: 'bg-success-50 text-success-700 ring-1 ring-inset ring-success-200',
    warning: 'bg-warning-50 text-warning-700 ring-1 ring-inset ring-warning-200',
    danger: 'bg-danger-50 text-danger-700 ring-1 ring-inset ring-danger-200',
    info: 'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span className={`inline-flex items-center rounded-md font-medium ${variantStyles[variant]} ${sizeStyles[size]}`}>
      {children}
    </span>
  );
}
