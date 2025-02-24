import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepProps {
  title: string;
  description?: string;
  completed?: boolean;
  active?: boolean;
}

interface StepperProps {
  steps: Array<{
    title: string;
    description?: string;
  }>;
  activeStep: number;
  className?: string;
}

const Step = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & StepProps
>(({ title, description, completed, active, className, ...props }, ref): JSX.Element => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col items-center",
      active && "text-primary",
      !active && !completed && "text-muted-foreground",
      className
    )}
    {...props}
  >
    <div
      className={cn(
        "relative flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
        completed && "border-primary bg-primary text-primary-foreground",
        active && "border-primary",
        !active && !completed && "border-muted"
      )}
    >
      {completed ? (
        <Check className="h-4 w-4" />
      ) : (
        <span className="text-sm font-medium">{props["aria-label"]}</span>
      )}
    </div>
    <div className="mt-2 text-center">
      <div className="text-sm font-medium">{title}</div>
      {description && (
        <div className="text-xs text-muted-foreground">{description}</div>
      )}
    </div>
  </div>
));
Step.displayName = "Step";

const StepConnector = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { completed?: boolean }
>(({ completed, className, ...props }, ref): JSX.Element => (
  <div
    ref={ref}
    className={cn(
      "flex-1 border-t transition-colors",
      completed ? "border-primary" : "border-muted",
      className
    )}
    {...props}
  />
));
StepConnector.displayName = "StepConnector";

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ steps, activeStep, className, ...props }, ref): JSX.Element => (
    <div
      ref={ref}
      className={cn("flex w-full items-center gap-2", className)}
      {...props}
    >
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <Step
            {...step}
            active={index === activeStep}
            completed={index < activeStep}
            aria-label={String(index + 1)}
          />
          {index < steps.length - 1 && (
            <StepConnector completed={index < activeStep} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
);
Stepper.displayName = "Stepper";

export { Stepper, type StepperProps }; 