import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/Utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
  VariantProps<typeof labelVariants> {
  required?: boolean;
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, required, children, ...props }, ref) => {
  const { t } = useTranslation()
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(labelVariants(), className)}
      {...props}
    >
      {children}
      {/* Libellé lu par les lecteurs d'écran, dans la langue de la page (avant : toujours en français) */}
      {required && <span className="text-destructive ms-1" aria-label={t('auth.required', 'Requis')}>*</span>}
    </LabelPrimitive.Root>
  )
})
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
