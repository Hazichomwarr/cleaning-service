import Image from "next/image";
import { BUSINESS } from "@/src/config/business";

export default function BusinessLogo({
  size = 40,
  alt = BUSINESS.name,
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
      src={BUSINESS.logoSrc}
      alt={alt}
      width={size}
      height={Math.round(size * (502 / 752))}
      priority={priority}
      style={{ width: size, height: "auto" }}
      className={`shrink-0 object-contain ${className ?? ""}`}
    />
  );
}
