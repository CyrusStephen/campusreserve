type ResourceCategoryIconProps = {
  type: 'room' | 'hall' | 'laboratory' | 'equipment'
  className?: string
}

const commonProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 1.65,
  vectorEffect: 'non-scaling-stroke' as const,
}

export default function ResourceCategoryIcon({ type, className }: ResourceCategoryIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      {type === 'room' && <>
        <path {...commonProps} d="M9 41.5h29.5M12 38V9.5l22-3V38" />
        <path {...commonProps} d="M17 36.5V13l12-1.7V38M25.5 25.5h.1" />
        <path {...commonProps} d="M34 14.5h4.5v22" />
      </>}

      {type === 'hall' && <>
        <path {...commonProps} d="M7.5 40.5h33M10 36.5V9.5h28v27" />
        <path {...commonProps} d="M13.5 13.5c3 3 5.5 3 8.5 0M34.5 13.5c-3 3-5.5 3-8.5 0" />
        <path {...commonProps} d="M14.5 20h19v10.5h-19M18 34.5h12" />
        <path {...commonProps} d="M18 24.5h12" />
      </>}

      {type === 'laboratory' && <>
        <path {...commonProps} d="M19 7.5h9M23.5 8v11.5L12.5 37a2.4 2.4 0 0 0 2 3.6h19a2.4 2.4 0 0 0 2-3.6l-11-17.5" />
        <path {...commonProps} d="M16.5 32.5h16M19.5 27.5c3 1.8 6 1.8 9 0" />
        <path {...commonProps} d="M33.5 8.5v9M30.5 13h6" />
        <circle {...commonProps} cx="24" cy="34.5" r="1" />
      </>}

      {type === 'equipment' && <>
        <path {...commonProps} d="M7.5 13.5h33v21h-33zM11.5 38.5h25" />
        <path {...commonProps} d="M12.5 18.5h13v10h-13M30 18.5h5M30 23h5M30 27.5h3" />
        <path {...commonProps} d="M17.5 34.5v4M30.5 34.5v4" />
        <path {...commonProps} d="M10.5 9.5h12" />
      </>}
    </svg>
  )
}
