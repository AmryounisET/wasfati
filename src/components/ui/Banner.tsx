import { type HTMLAttributes, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const variantClasses = {
  success: "bg-success-050 border-success-100 text-success-700",
  warning: "bg-warning-050 border-warning-100 text-warning-700",
  danger: "bg-danger-050 border-danger-100 text-danger-700",
  info: "bg-primary-050 border-primary-100 text-primary-900",
} as const;

const defaultIcon = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: ShieldAlert,
  info: Info,
} as const;

export interface BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: keyof typeof variantClasses;
  title?: ReactNode;
  icon?: ReactNode;
}

export function Banner({
  className,
  variant = "info",
  title,
  icon,
  children,
  ...props
}: BannerProps) {
  const Icon = defaultIcon[variant];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 text-bodym",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <span className="mt-0.5 shrink-0">{icon ?? <Icon size={20} />}</span>
      <div className="flex-1 space-y-0.5">
        {title && <p className="text-h3 font-semibold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}
