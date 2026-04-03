import { institutionConfig } from '../config/institution';

interface AppLogoProps {
  className?: string;
}

export default function AppLogo({ className }: AppLogoProps) {
  return (
    <img
      src={institutionConfig.logoPath}
      alt={institutionConfig.logoAlt}
      className={className}
    />
  );
}
