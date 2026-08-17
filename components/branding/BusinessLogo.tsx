import Image from "next/image";

export default function BusinessLogo({
  size = 40,
  alt = "Just Cleaning",
  priority = false,
  className,
}: {
  size?: number;
  alt?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/images/logo.png"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={`shrink-0 object-contain ${className ?? ""}`}
    />
  );
}
