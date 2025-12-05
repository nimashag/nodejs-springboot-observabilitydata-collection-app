import React, { useRef, useEffect } from 'react';
import './Homepics.css';

import burgersimg from '../../../../assets/food/burger.jpg';
import pizzaimg from '../../../../assets/food/pizza.jpg';
import noodlesimg from '../../../../assets/food/noodles.jpg';
import sushiimg from '../../../../assets/food/sushi.jpg';
import saladimg from '../../../../assets/food/salad.jpg';
import wrapsimg from '../../../../assets/food/wraps.jpg';
import tacosimg from '../../../../assets/food/tacos.jpg';
import dessertsimg from '../../../../assets/food/tiramisu.jpg';
import drinksimg from '../../../../assets/food/drinks.jpg';
import pastaimg from '../../../../assets/food/pasta.jpg';
import friedriceimg from '../../../../assets/food/rice.jpg';
import soupsimg from '../../../../assets/food/soup.jpg';

const Homepics: React.FC = () => {
    const items = [
        { id: 1, img: burgersimg, label: 'B U R G E R S' },
        { id: 2, img: pizzaimg, label: 'P I Z Z A' },
        { id: 3, img: noodlesimg, label: 'N O O D L E S' },
        { id: 4, img: sushiimg, label: 'S U S H I' },
        { id: 5, img: saladimg, label: 'S A L A D S' },
        { id: 6, img: wrapsimg, label: 'W R A P S' },
        { id: 7, img: tacosimg, label: 'T A C O S' },
        { id: 8, img: dessertsimg, label: 'D E S S E R T S' },
        { id: 9, img: drinksimg, label: 'D R I N K S' },
        { id: 10, img: pastaimg, label: 'P A S T A' },
        { id: 11, img: friedriceimg, label: 'R I C E' },
        { id: 12, img: soupsimg, label: 'S O U P S' }
    ];

    const listRef = useRef<HTMLDivElement>(null);
    const quantity = items.length;

    useEffect(() => {
        if (listRef.current) {
            const itemWidth = 250; 
            const totalWidth = (itemWidth + 30) * quantity; 
            listRef.current.style.setProperty('--width', totalWidth + 'px');
        }
    }, [quantity]);

    return (
        <div className="automated-slider" style={{ '--quantity': quantity, '--gap': '30px' } as React.CSSProperties}>
            <div className="list" ref={listRef}>
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className="item"
                        style={{ '--position': index + 1 } as React.CSSProperties}
                    >
                        <img src={item.img} alt={item.label} />
                        <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center' }}>
                            <p className="prata-regular">{item.label}</p>
                        </div>
                    </div>
                ))}
                {items.map((item, index) => (
                    <div
                        key={`${item.id}-duplicate`}
                        className="item"
                        style={{ '--position': index + 1 } as React.CSSProperties}
                    >
                        <img src={item.img} alt={item.label} />
                        <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center' }}>
                            <p className="prata-regular font-bold">{item.label}</p>
                        </div>
                    </div>
                ))}
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className="item"
                        style={{ '--position': index + 1 } as React.CSSProperties}
                    >
                        <img src={item.img} alt={item.label} />
                        <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center' }}>
                            <p className="prata-regular">{item.label}</p>
                        </div>
                    </div>
                ))}
                {items.map((item, index) => (
                    <div
                        key={`${item.id}-duplicate`}
                        className="item"
                        style={{ '--position': index + 1 } as React.CSSProperties}
                    >
                        <img src={item.img} alt={item.label} />
                        <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center' }}>
                            <p className="prata-regular font-bold">{item.label}</p>
                        </div>
                    </div>
                ))}
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className="item"
                        style={{ '--position': index + 1 } as React.CSSProperties}
                    >
                        <img src={item.img} alt={item.label} />
                        <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center' }}>
                            <p className="prata-regular">{item.label}</p>
                        </div>
                    </div>
                ))}
                {items.map((item, index) => (
                    <div
                        key={`${item.id}-duplicate`}
                        className="item"
                        style={{ '--position': index + 1 } as React.CSSProperties}
                    >
                        <img src={item.img} alt={item.label} />
                        <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center' }}>
                            <p className="prata-regular font-bold">{item.label}</p>
                        </div>
                    </div>
                ))}
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className="item"
                        style={{ '--position': index + 1 } as React.CSSProperties}
                    >
                        <img src={item.img} alt={item.label} />
                        <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center' }}>
                            <p className="prata-regular">{item.label}</p>
                        </div>
                    </div>
                ))}
                {items.map((item, index) => (
                    <div
                        key={`${item.id}-duplicate`}
                        className="item"
                        style={{ '--position': index + 1 } as React.CSSProperties}
                    >
                        <img src={item.img} alt={item.label} />
                        <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center' }}>
                            <p className="prata-regular font-bold">{item.label}</p>
                        </div>
                    </div>
                ))}
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className="item"
                        style={{ '--position': index + 1 } as React.CSSProperties}
                    >
                        <img src={item.img} alt={item.label} />
                        <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center' }}>
                            <p className="prata-regular">{item.label}</p>
                        </div>
                    </div>
                ))}
                {items.map((item, index) => (
                    <div
                        key={`${item.id}-duplicate`}
                        className="item"
                        style={{ '--position': index + 1 } as React.CSSProperties}
                    >
                        <img src={item.img} alt={item.label} />
                        <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center' }}>
                            <p className="prata-regular font-bold">{item.label}</p>
                        </div>
                    </div>
                ))}
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className="item"
                        style={{ '--position': index + 1 } as React.CSSProperties}
                    >
                        <img src={item.img} alt={item.label} />
                        <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center' }}>
                            <p className="prata-regular">{item.label}</p>
                        </div>
                    </div>
                ))}
                {items.map((item, index) => (
                    <div
                        key={`${item.id}-duplicate`}
                        className="item"
                        style={{ '--position': index + 1 } as React.CSSProperties}
                    >
                        <img src={item.img} alt={item.label} />
                        <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center' }}>
                            <p className="prata-regular font-bold">{item.label}</p>
                        </div>
                    </div>
                ))}
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className="item"
                        style={{ '--position': index + 1 } as React.CSSProperties}
                    >
                        <img src={item.img} alt={item.label} />
                        <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center' }}>
                            <p className="prata-regular">{item.label}</p>
                        </div>
                    </div>
                ))}
                {items.map((item, index) => (
                    <div
                        key={`${item.id}-duplicate`}
                        className="item"
                        style={{ '--position': index + 1 } as React.CSSProperties}
                    >
                        <img src={item.img} alt={item.label} />
                        <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center' }}>
                            <p className="prata-regular font-bold">{item.label}</p>
                        </div>
                    </div>
                ))}
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className="item"
                        style={{ '--position': index + 1 } as React.CSSProperties}
                    >
                        <img src={item.img} alt={item.label} />
                        <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center' }}>
                            <p className="prata-regular">{item.label}</p>
                        </div>
                    </div>
                ))}
                {items.map((item, index) => (
                    <div
                        key={`${item.id}-duplicate`}
                        className="item"
                        style={{ '--position': index + 1 } as React.CSSProperties}
                    >
                        <img src={item.img} alt={item.label} />
                        <div style={{ marginTop: '10px', padding: '10px', textAlign: 'center' }}>
                            <p className="prata-regular font-bold">{item.label}</p>
                        </div>
                    </div>
                ))}
            </div>
            <br />
        </div>
    );
};

export default Homepics;
