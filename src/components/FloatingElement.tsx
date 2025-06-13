
import { cn } from "@/lib/utils";

interface FloatingElementProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const FloatingElement = ({ children, className, delay = 0 }: FloatingElementProps) => {
  return (
    <div 
      className={cn("absolute floating-animation", className)}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
};

export default FloatingElement;
