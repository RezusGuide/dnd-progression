import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const HEX_SIZE = 35;
const GRID_RADIUS = 4;
const ASPECTS = ['IGNIS', 'AER', 'AQUA', 'TERRA', 'ORDO', 'PERDITIO', 'MAGMA', 'MOTUS', 'SANO', 'TUTAMEN', 'MORTUUS'];

const hexPoints = () => {
    let points = [];
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i - 30;
        const angle_rad = Math.PI / 180 * angle_deg;
        const x = HEX_SIZE * Math.cos(angle_rad);
        const y = HEX_SIZE * Math.sin(angle_rad);
        points.push(`${x},${y}`);
    }
    return points.join(' ');
};

const axialToPixel = (q, r) => {
    const x = HEX_SIZE * Math.sqrt(3) * (q + r / 2);
    const y = HEX_SIZE * (3 / 2) * r;
    return { x, y };
};

const hexes = [];
for (let q = -GRID_RADIUS; q <= GRID_RADIUS; q++) {
    const r1 = Math.max(-GRID_RADIUS, -q - GRID_RADIUS);
    const r2 = Math.min(GRID_RADIUS, -q + GRID_RADIUS);
    for (let r = r1; r <= r2; r++) {
        hexes.push({ q, r });
    }
}

export default function Research() {
    const { characterId, spellId } = useParams();
    const navigate = useNavigate();
    
    const [activeAspect, setActiveAspect] = useState(ASPECTS[0]);
    const [placedNodes, setPlacedNodes] = useState({});
    const [anchors, setAnchors] = useState([]);

    useEffect(() => {
        // Fetch draft state
        api.get(`/api/characters/${characterId}/research/${spellId}/draft`)
            .then(res => {
                if (res.data) {
                    try {
                        setPlacedNodes(JSON.parse(res.data));
                    } catch (e) {
                        console.error('Failed to parse draft state', e);
                    }
                }
            })
            .catch(err => {
                console.log('No draft found, initializing empty grid.', err);
                setPlacedNodes({});
            });

        // Fetch dynamic anchors
        api.get(`/api/spells/${spellId}`)
            .then(res => {
                if (res.data && res.data.arcaneSignature) {
                    setAnchors(res.data.arcaneSignature);
                }
            })
            .catch(err => {
                console.error('Failed to load spell anchors', err);
            });
    }, [characterId, spellId]);

    const handleHexClick = (q, r) => {
        // Prevent clicking anchors
        if (anchors.some(a => a.q === q && a.r === r)) return;
        
        const key = `${q},${r}`;
        setPlacedNodes(prev => {
            const newNodes = { ...prev };
            if (newNodes[key] === activeAspect) {
                delete newNodes[key]; // toggle off if same aspect
            } else {
                newNodes[key] = activeAspect;
            }
            return newNodes;
        });
    };

    const handleSaveDraft = async () => {
        try {
            await api.put(`/api/characters/${characterId}/research/${spellId}/draft`, {
                gridState: JSON.stringify(placedNodes)
            });
            alert('Draft saved!');
        } catch (error) {
            console.error(error);
            alert('Failed to save draft.');
        }
    };

    const handleComplete = async () => {
        try {
            const res = await api.post(`/api/characters/${characterId}/research/${spellId}/complete`, {
                finalGridState: JSON.stringify(placedNodes)
            });
            alert(`Research complete! Accuracy: ${res.data.accuracyPercentage}%\n${res.data.message}`);
            navigate(`/characters/${characterId}`);
        } catch (error) {
            console.error(error);
            alert('Failed to complete research.');
        }
    };

    return (
        <div className="parchment-page">
            <div className="research-container">
                <h1 className="tome-title">Spell Research</h1>
                <p className="tome-subtitle">Connect the anchor points using elemental runes</p>
                
                <div className="aspect-palette">
                    {ASPECTS.map(aspect => (
                        <button 
                            key={aspect} 
                            className={`aspect-btn ${activeAspect === aspect ? 'active' : ''}`}
                            onClick={() => setActiveAspect(aspect)}
                        >
                            {aspect}
                        </button>
                    ))}
                </div>
                
                <svg width="600" height="500" viewBox="-300 -250 600 500">
                    {hexes.map(({ q, r }) => {
                        const { x, y } = axialToPixel(q, r);
                        const key = `${q},${r}`;
                        
                        const anchor = anchors.find(a => a.q === q && a.r === r);
                        const isPlaced = !!placedNodes[key];
                        
                        let hexClass = 'hex-polygon';
                        let displayAspect = '';
                        
                        if (anchor) {
                            hexClass += ' anchor';
                            displayAspect = anchor.aspect;
                        } else if (isPlaced) {
                            hexClass += ' placed';
                            displayAspect = placedNodes[key];
                        }

                        return (
                            <g key={key} transform={`translate(${x}, ${y})`} onClick={() => handleHexClick(q, r)}>
                                <polygon points={hexPoints()} className={hexClass} />
                                {displayAspect && (
                                    <text 
                                        textAnchor="middle" 
                                        alignmentBaseline="middle" 
                                        fontSize="10" 
                                        fill="#f4ecd8"
                                        fontFamily="Cinzel"
                                        pointerEvents="none"
                                    >
                                        {displayAspect.substring(0, 3).toUpperCase()}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button className="aspect-btn" onClick={handleSaveDraft}>Save Draft</button>
                    <button className="aspect-btn active" onClick={handleComplete}>Complete Research</button>
                </div>
            </div>
        </div>
    );
}
