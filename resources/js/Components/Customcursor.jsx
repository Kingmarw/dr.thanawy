import gsap from 'gsap';
import { useEffect, useRef } from 'react';

/**
 * كيرسر مخصص بهوية "دكتور ثانوي": نقطة ذهبية صغيرة + حلقة أزرق فاتح بتتبعها بتأخير ناعم،
 * وتكبر تلقائيًا فوق أي عنصر قابل للنقر (روابط/أزرار) أو أي عنصر عليه data-cursor-hover.
 *
 * + عند أي كليك في أي مكان بالموقع: انفجار صغير من نجوم ذهبية بيتناثر حوالين نقطة
 *   الكليك ويختفي — إحساس احتفالي خفيف بدل تأثير كليك عادي، وبيرجّع لروح النجوم/الليل
 *   المرتبطة بالزخارف الإسلامية من غير ما يبقى مبالغ فيه.
 *
 * يتجاهل نفسه تلقائيًا على اللمس (موبايل/تابلت) وعلى prefers-reduced-motion.
 *
 * التركيب: ركّبه مرة واحدة بجانب <App /> في resources/js/app.jsx:
 *      import CustomCursor from '@/Components/CustomCursor';
 *      ...
 *      root.render(
 *          <>
 *              <CustomCursor />
 *              <PageLoader />
 *              <App {...props} />
 *          </>
 *      );
 */

// شكل نجمة صغيرة بخمس رؤوس — تستخدم كعنصر SVG لكل شرارة في الانفجار
const STAR_PATH =
    'M12 2.4 14.3 8.9 21.1 9.3 15.7 13.4 17.6 20 12 16.1 6.4 20 8.3 13.4 2.9 9.3 9.7 8.9 Z';

function spawnStarBurst(x, y, container) {
    const starCount = 7;
    const colors = ['#C99A2E', '#E4C878', '#FFFFFF'];

    for (let i = 0; i < starCount; i += 1) {
        const angle = (Math.PI * 2 * i) / starCount + Math.random() * 0.6;
        const distance = 34 + Math.random() * 46;
        const size = 6 + Math.random() * 7;
        const color = colors[i % colors.length];

        const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        star.setAttribute('viewBox', '0 0 24 24');
        star.setAttribute('width', String(size));
        star.setAttribute('height', String(size));
        star.style.position = 'fixed';
        star.style.left = `${x}px`;
        star.style.top = `${y}px`;
        star.style.zIndex = '9998';
        star.style.pointerEvents = 'none';
        star.style.willChange = 'transform, opacity';

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', STAR_PATH);
        path.setAttribute('fill', color);
        star.appendChild(path);
        container.appendChild(star);

        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;

        gsap.fromTo(
            star,
            { x: 0, y: 0, scale: 0.4, rotate: 0, opacity: 1 },
            {
                x: dx,
                y: dy,
                scale: 1,
                rotate: Math.random() * 200 - 100,
                opacity: 0,
                duration: 0.65 + Math.random() * 0.25,
                ease: 'power2.out',
                onComplete: () => star.remove(),
            },
        );
    }
}

export default function CustomCursor() {
    const dotRef = useRef(null);
    const ringRef = useRef(null);
    const burstLayerRef = useRef(null);

    useEffect(() => {
        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (isTouch || reduced) return undefined;

        document.body.classList.add('brand-cursor-active');

        const dot = dotRef.current;
        const ring = ringRef.current;
        const burstLayer = burstLayerRef.current;

        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let ringX = mouseX;
        let ringY = mouseY;

        const onMove = (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
        };

        // الحلقة بتتحرك بتأخير ناعم (lerp) عشان تحس إنها "بتلحق" النقطة مش لاصقة بيها
        let rafId;
        const tick = () => {
            ringX += (mouseX - ringX) * 0.16;
            ringY += (mouseY - ringY) * 0.16;
            ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
            rafId = requestAnimationFrame(tick);
        };

        const hoverSelector = 'a, button, [role="button"], input, textarea, select, [data-cursor-hover]';

        const onOver = (e) => {
            if (e.target.closest?.(hoverSelector)) {
                ring.classList.add('is-hovering');
                dot.classList.add('is-hovering');
            }
        };
        const onOut = (e) => {
            if (e.target.closest?.(hoverSelector)) {
                ring.classList.remove('is-hovering');
                dot.classList.remove('is-hovering');
            }
        };
        const onDown = (e) => {
            ring.classList.add('is-pressing');
            spawnStarBurst(e.clientX, e.clientY, burstLayer);
        };
        const onUp = () => ring.classList.remove('is-pressing');
        const onLeaveWindow = () => {
            dot.style.opacity = '0';
            ring.style.opacity = '0';
        };
        const onEnterWindow = () => {
            dot.style.opacity = '1';
            ring.style.opacity = '1';
        };

        window.addEventListener('mousemove', onMove);
        document.addEventListener('mouseover', onOver);
        document.addEventListener('mouseout', onOut);
        window.addEventListener('mousedown', onDown);
        window.addEventListener('mouseup', onUp);
        document.addEventListener('mouseleave', onLeaveWindow);
        document.addEventListener('mouseenter', onEnterWindow);
        rafId = requestAnimationFrame(tick);

        return () => {
            document.body.classList.remove('brand-cursor-active');
            window.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseover', onOver);
            document.removeEventListener('mouseout', onOut);
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('mouseup', onUp);
            document.removeEventListener('mouseleave', onLeaveWindow);
            document.removeEventListener('mouseenter', onEnterWindow);
            cancelAnimationFrame(rafId);
        };
    }, []);

    return (
        <>
            <div ref={dotRef} className="brand-cursor-dot" aria-hidden="true" />
            <div ref={ringRef} className="brand-cursor-ring" aria-hidden="true" />
            {/* حاوية شرارات النجوم — كل نجمة بتتولد وتتشال من هنا وقت الكليك */}
            <div ref={burstLayerRef} aria-hidden="true" />

            <style>{`
                body.brand-cursor-active,
                body.brand-cursor-active a,
                body.brand-cursor-active button {
                    cursor: none;
                }

                .brand-cursor-dot,
                .brand-cursor-ring {
                    position: fixed;
                    top: 0;
                    left: 0;
                    z-index: 9999;
                    pointer-events: none;
                    will-change: transform;
                    transition: opacity 0.2s ease, width 0.2s ease, height 0.2s ease, background 0.2s ease, border-color 0.2s ease;
                }

                .brand-cursor-dot {
                    width: 6px;
                    height: 6px;
                    margin: -3px 0 0 -3px;
                    border-radius: 9999px;
                    background: #C99A2E;
                }
                .brand-cursor-dot.is-hovering {
                    width: 4px;
                    height: 4px;
                    margin: -2px 0 0 -2px;
                    background: #E4C878;
                }

                .brand-cursor-ring {
                    width: 34px;
                    height: 34px;
                    margin: -17px 0 0 -17px;
                    border-radius: 9999px;
                    border: 1.4px solid rgba(201,154,46,0.55);
                    background: rgba(23,105,170,0.06);
                }
                .brand-cursor-ring.is-hovering {
                    width: 54px;
                    height: 54px;
                    margin: -27px 0 0 -27px;
                    border-color: #C99A2E;
                    background: rgba(201,154,46,0.1);
                }
                .brand-cursor-ring.is-pressing {
                    width: 28px;
                    height: 28px;
                    margin: -14px 0 0 -14px;
                }

                @media (pointer: coarse) {
                    .brand-cursor-dot, .brand-cursor-ring { display: none; }
                }
            `}</style>
        </>
    );
}