interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`w-full max-w-shell mx-auto px-4 laptop:px-5 desktop:px-6 xl-screen:px-8 py-5 laptop:py-6 desktop:py-7 ${className}`}>
      {children}
    </div>
  );
}
