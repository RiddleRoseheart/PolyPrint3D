import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';

const StarsBackground = ({ zIndex = -1, starCount = 100, enableRipples = true }) => {
    // For stars/constellation animation
    const [stars, setStars] = useState([]);
    const canvasRef = useRef(null);
    const constellationRef = useRef(null);
    const animationFrameIdRef = useRef(null);
    const mountedRef = useRef(true);
    const resizeHandlerRef = useRef(null);
    const throttleTimerRef = useRef(null);
    
    useEffect(() => {
        mountedRef.current = true;
        
        // Create stars with higher brightness and size
        const initialStars = Array.from({ length: starCount }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: Math.random() * 3 + 1, // Bigger stars (1-4px)
            opacity: Math.random() * 0.7 + 0.3, // Brighter stars (0.3-1.0 opacity)
            // Only add ripple effect if enabled and only to some stars
            ripple: enableRipples && Math.random() > 0.6, // More stars with ripples
            // Simplified ripple data for better performance
            ripples: enableRipples ? Array.from({ length: Math.floor(Math.random() * 2) + 1 }, () => ({ 
                size: 0,
                maxSize: Math.random() * 80 + 40, // Larger ripples
                speed: Math.random() * 0.4 + 0.2,
                opacity: 0,
                maxOpacity: Math.random() * 0.5 + 0.2, // More visible ripples
                active: false,
                delay: Math.floor(Math.random() * 3000),
                delayCount: Math.floor(Math.random() * 2000),
            })) : [],
        }));
        setStars(initialStars);
        
        // Setup constellation canvas
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            constellationRef.current = ctx;
            
            // Set canvas to full screen
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            // Handle resize with throttling
            const handleResize = () => {
                if (throttleTimerRef.current) return;
                
                throttleTimerRef.current = setTimeout(() => {
                    throttleTimerRef.current = null;
                    
                    if (canvasRef.current) {
                        canvasRef.current.width = window.innerWidth;
                        canvasRef.current.height = window.innerHeight;
                    }
                }, 200);
            };
            window.addEventListener('resize', handleResize);
            resizeHandlerRef.current = handleResize;
            
            // Animation for constellation lines - using throttling and optimization
            let lastAnimationTime = 0;
            const FRAME_RATE = 30; // Increased to 30fps for smoother animation
            const FRAME_INTERVAL = 1000 / FRAME_RATE;
            
            const animateConstellation = (timestamp) => {
                if (!mountedRef.current || !ctx || !canvasRef.current) return;
                
                // Throttle frame rate
                if (timestamp - lastAnimationTime < FRAME_INTERVAL) {
                    animationFrameIdRef.current = requestAnimationFrame(animateConstellation);
                    return;
                }
                
                lastAnimationTime = timestamp;
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Draw brighter constellation lines
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // More visible lines
                ctx.lineWidth = 0.7; // Thicker lines
                
                // Create more constellation connections
                const maxDistance = Math.min(window.innerWidth, window.innerHeight) * 0.15; // Dynamic distance based on screen size
                
                // Draw constellation lines
                for (let i = 0; i < stars.length; i++) {
                    // Create more connections by checking more stars
                    for (let j = i + 1; j < stars.length; j++) {
                        const dx = stars[i].x - stars[j].x;
                        const dy = stars[i].y - stars[j].y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < maxDistance) {
                            // Fade line opacity based on distance
                            const opacity = 0.2 * (1 - distance / maxDistance);
                            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                            
                            ctx.beginPath();
                            ctx.moveTo(stars[i].x, stars[i].y);
                            ctx.lineTo(stars[j].x, stars[j].y);
                            ctx.stroke();
                        }
                    }
                }
                
                // Draw brighter dots at stars' locations to enhance constellation effect
                for (let i = 0; i < stars.length; i++) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.beginPath();
                    ctx.arc(stars[i].x, stars[i].y, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Animate stars with performance optimizations
                setStars(prevStars => 
                    prevStars.map((star, index) => {
                        // Simplified star movement
                        const newStar = {
                            ...star,
                            x: star.x + (Math.random() - 0.5) * 0.1,
                            y: star.y + (Math.random() - 0.5) * 0.1,
                        };
                        
                        // Process ripples
                        if (star.ripple && star.ripples) {
                            newStar.ripples = star.ripples.map(ripple => {
                                let { size, opacity, active, delay, delayCount, maxSize, speed, maxOpacity } = ripple;
                                
                                // Handle delay before activating ripple
                                if (!active) {
                                    delayCount += FRAME_INTERVAL;
                                    if (delayCount >= delay) {
                                        active = true;
                                    }
                                }
                                
                                // Animate ripple if it's active
                                if (active) {
                                    size += speed;
                                    
                                    // Simplified opacity calculation
                                    opacity = size < maxSize * 0.5 ? 
                                        maxOpacity : 
                                        maxOpacity * (1 - ((size - (maxSize * 0.5)) / (maxSize * 0.5)));
                                    
                                    // Reset ripple when it reaches max size
                                    if (size >= maxSize) {
                                        size = 0;
                                        opacity = 0;
                                        delay = Math.floor(Math.random() * 3000);
                                        delayCount = 0;
                                        active = false;
                                    }
                                }
                                
                                return {
                                    ...ripple,
                                    size,
                                    opacity,
                                    active,
                                    delay,
                                    delayCount
                                };
                            });
                        }
                        
                        return newStar;
                    })
                );
                
                animationFrameIdRef.current = requestAnimationFrame(animateConstellation);
            };
            
            animationFrameIdRef.current = requestAnimationFrame(animateConstellation);
        }
        
        return () => {
            mountedRef.current = false;
            
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
            
            if (resizeHandlerRef.current) {
                window.removeEventListener('resize', resizeHandlerRef.current);
            }
            
            if (throttleTimerRef.current) {
                clearTimeout(throttleTimerRef.current);
            }
        };
    }, [starCount, enableRipples]);

    const styles = {
        root: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: zIndex,
            willChange: 'transform', // Performance optimization
        },
        starsCanvas: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: zIndex,
        },
        star: {
            position: 'fixed',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 0 8px rgba(255, 255, 255, 0.5)', // Stronger glow
            pointerEvents: 'none',
            willChange: 'transform, opacity', // Performance optimization
        },
        starRipple: {
            position: 'fixed',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.2)', // More visible ripple border
            pointerEvents: 'none',
            zIndex: zIndex,
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, rgba(0, 0, 0, 0) 70%)', // Subtle gradient for ripples
            willChange: 'transform, opacity', // Performance optimization
        },
    };

    return (
        <Box sx={styles.root}>
            {/* Constellation Canvas */}
            <canvas ref={canvasRef} style={styles.starsCanvas}></canvas>
            
            {/* Stars */}
            {stars.map((star, index) => (
                <React.Fragment key={index}>
                    <div
                        style={{
                            ...styles.star,
                            left: `${star.x}px`,
                            top: `${star.y}px`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            opacity: star.opacity,
                        }}
                    />
                    {star.ripple && star.ripples && star.ripples.map((ripple, rippleIndex) => (
                        ripple.active && ripple.size > 0 && (
                            <div
                                key={`ripple-${index}-${rippleIndex}`}
                                style={{
                                    ...styles.starRipple,
                                    left: `${star.x - ripple.size/2}px`,
                                    top: `${star.y - ripple.size/2}px`,
                                    width: `${ripple.size}px`,
                                    height: `${ripple.size}px`,
                                    opacity: ripple.opacity,
                                }}
                            />
                        )
                    ))}
                </React.Fragment>
            ))}
        </Box>
    );
};

export default StarsBackground;