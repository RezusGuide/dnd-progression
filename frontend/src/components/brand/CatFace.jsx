// The cat's head, shared by CatMascot and CatHead. Transcribed from
// docs/zlatopryady/assets/mascot-cat*.svg (the old <use href="#catface">
// is expanded inline so several cats on one page never fight over an id).
// Group names (cat-head, cat-ears, cat-eyes) are animation hooks - see
// styles/brand.css and components/errors/ErrorScreen.css.
export default function CatFace({ sleeping = false }) {
    return (
        <g className="cat-head">
            <g className="cat-ears">
                <polygon className="m-fur" points="84,112 76,36 144,78" />
                <polygon className="m-fur" points="236,112 244,36 176,78" />
                <polygon className="m-ear-inner" points="94,98 90,58 126,80" />
                <polygon className="m-ear-inner" points="226,98 230,58 194,80" />
            </g>
            <ellipse className="m-fur" cx="160" cy="150" rx="92" ry="82" />
            <path className="m-dawn" d="M146 112 A14 14 0 0 1 174 112 Z" />
            <g className="m-dawn-stroke" strokeWidth="3" strokeLinecap="round">
                <line x1="160" y1="92" x2="160" y2="86" />
                <line x1="147" y1="97" x2="143" y2="92" />
                <line x1="173" y1="97" x2="177" y2="92" />
            </g>
            <ellipse className="m-fur-light" cx="160" cy="182" rx="46" ry="30" />
            <circle className="m-cheek" cx="98" cy="178" r="9" opacity="0.6" />
            <circle className="m-cheek" cx="222" cy="178" r="9" opacity="0.6" />
            <g className="cat-eyes">
                {sleeping ? (
                    <g className="m-ink-stroke" strokeWidth="4" strokeLinecap="round" fill="none">
                        <path d="M106 152 Q122 164 138 152" />
                        <path d="M182 152 Q198 164 214 152" />
                    </g>
                ) : (
                    <>
                        <g className="cat-eye">
                            <ellipse className="m-white" cx="122" cy="150" rx="18" ry="22" />
                            <circle className="m-dawn" cx="125" cy="152" r="13" />
                            <ellipse className="m-ink" cx="126" cy="152" rx="5.5" ry="10.5" />
                            <circle className="m-white" cx="121" cy="146" r="3.5" />
                        </g>
                        <g className="cat-eye">
                            <ellipse className="m-white" cx="198" cy="150" rx="18" ry="22" />
                            <circle className="m-dawn" cx="195" cy="152" r="13" />
                            <ellipse className="m-ink" cx="194" cy="152" rx="5.5" ry="10.5" />
                            <circle className="m-white" cx="191" cy="146" r="3.5" />
                        </g>
                    </>
                )}
            </g>
            <path className="m-ember" d="M152 174 H168 L160 184 Z" />
            <path className="m-ink-stroke" d="M160 184 V190 M160 190 Q150 199 142 192 M160 190 Q170 199 178 192" fill="none" strokeWidth="3" strokeLinecap="round" />
            <g className="m-ink-stroke" strokeWidth="2" strokeLinecap="round">
                <line x1="112" y1="184" x2="70" y2="176" />
                <line x1="112" y1="192" x2="72" y2="198" />
                <line x1="208" y1="184" x2="250" y2="176" />
                <line x1="208" y1="192" x2="248" y2="198" />
            </g>
        </g>
    )
}
