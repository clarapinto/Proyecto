import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export default function Card({ children, className = '', onClick, hover = true }: CardProps) {
  const baseStyles = 'bg-white rounded-xl shadow-sm border border-secondary-200/60 overflow-hidden';
  const clickableStyles = onClick ? 'cursor-pointer' : '';
  const hoverStyles = hover && onClick ? 'hover:shadow-md hover:border-secondary-300 transition-all duration-200' : '';

  return (
    <div
      className={`${baseStyles} ${clickableStyles} ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
