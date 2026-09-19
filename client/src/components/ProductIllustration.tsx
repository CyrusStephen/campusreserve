type ProductIllustrationProps = {
  type: 'spaces' | 'canteen' | 'events'
  className?: string
}

const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 2.6,
  vectorEffect: 'non-scaling-stroke' as const,
}

export default function ProductIllustration({ type, className }: ProductIllustrationProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 240 145" xmlns="http://www.w3.org/2000/svg">
      {type === 'spaces' && <>
        <path className="cr-product-art-paper" d="M41 31.5h155v90H41z" />
        <path {...line} d="M41 31.5h155v90H41zM41 50h155M51 41h.1M60 41h.1M69 41h.1" />
        <path className="cr-product-art-accent" d="M58 65h50v38H58z" />
        <path {...line} d="M58 65h50v38H58zM66 94l13-13 9 8 9-12 11 14M121 65h57v16h-57zM121 90h24v13h-24M154 90h24v13h-24" />
        <path className="cr-product-art-pop" d="M24 19h45v40H24z" />
        <path {...line} d="M24 19h45v40H24zM35 39h23M46.5 27.5v23" />
        <path {...line} d="M189 105c13-3 24 2 28 13M204 103l2 6M216 108l-5 5" />
      </>}

      {type === 'canteen' && <>
        <path className="cr-product-art-paper" d="M39 102h164l-9 20H48z" />
        <path {...line} d="M39 102h164l-9 20H48zM31 102h180" />
        <path className="cr-product-art-accent" d="M111 59h60v43h-60z" />
        <path {...line} d="M111 59h60v43h-60zM121 59v-9h40v9M171 68h10c9 0 9 18 0 18h-10" />
        <path {...line} d="M130 76c4 5 8 5 12 0M126 70h.1M146 70h.1" />
        <path className="cr-product-art-pop" d="M52 73c0-23 11-37 29-37s29 14 29 37z" />
        <path {...line} d="M52 73c0-23 11-37 29-37s29 14 29 37M45 74h72M81 36v-7M75 29h12" />
        <path {...line} d="M133 42c-8-8 7-9-1-18M149 42c-8-8 7-9-1-18" />
        <circle className="cr-product-art-paper" cx="194" cy="38" r="19" />
        <path {...line} d="M194 19a19 19 0 1 1 0 38 19 19 0 0 1 0-38M187 38h.1M201 38h.1M188 46c4-4 8-4 12 0" />
      </>}

      {type === 'events' && <>
        <path className="cr-product-art-paper" d="M39 34h157v86H39z" />
        <path {...line} d="M39 34h157v86H39zM39 52h157M50 43h.1M59 43h.1M68 43h.1" />
        <path className="cr-product-art-accent" d="M55 65h63v38H55z" />
        <path {...line} d="M55 65h63v38H55zM65 93l10-12 8 7 10-14 14 19" />
        <path className="cr-product-art-pop" d="M130 66h48v38h-48z" />
        <path {...line} d="M130 66h48v38h-48zM139 75h7v7h-7zM153 75h7v7h-7zM139 88h7v7h-7zM153 88h16M166 75h3M153 95h8" />
        <path className="cr-product-art-paper" d="M178 18c19 0 34 14 34 31s-15 31-34 31l-9 10 1-13c-15-3-26-14-26-28 0-17 15-31 34-31z" />
        <path {...line} d="M178 18c19 0 34 14 34 31s-15 31-34 31l-9 10 1-13c-15-3-26-14-26-28 0-17 15-31 34-31zM166 47h.1M189 47h.1M167 58c7 5 14 5 21 0" />
        <path {...line} d="M55 111v17M180 111v17M48 128h139" />
      </>}
    </svg>
  )
}
