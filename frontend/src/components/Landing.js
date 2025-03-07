import React, { useEffect, useState, useRef } from 'react';
import { 
  Typography, 
  Button, 
  Container, 
  Card,
  Fade,
  Zoom,
} from '@mui/material';
import { Link } from 'react-router-dom';

import PrintIcon from '@mui/icons-material/Print';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SpeedIcon from '@mui/icons-material/Speed';
import GroupsIcon from '@mui/icons-material/Groups';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

const Landing = ({ user }) => {
    const [showTeam, setShowTeam] = useState(false);
    const [showProject, setShowProject] = useState(false);
    const [showHowItWorks, setShowHowItWorks] = useState(false);
    const [heroLoaded, setHeroLoaded] = useState(false);
    
    // For stars/constellation animation
    const [stars, setStars] = useState([]);
    const canvasRef = useRef(null);
    const constellationRef = useRef(null);
    
    useEffect(() => {
        // Set hero as loaded with a slight delay for animation sequence
        setTimeout(() => setHeroLoaded(true), 500);
        
        // Create stars
        const initialStars = Array.from({ length: 150 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.5 + 0.1,
            pulsate: Math.random() * 0.02 + 0.01,
            pulsateSpeed: Math.random() * 0.005 + 0.001,
            ripple: Math.random() > 0.6, // More stars will have ripple effect
            ripples: Array.from({ length: 3 }, () => ({ // Each star has multiple ripples
                size: 0,
                maxSize: Math.random() * 70 + 30,
                speed: Math.random() * 0.5 + 0.2,
                opacity: 0,
                maxOpacity: Math.random() * 0.4 + 0.1,
                active: false,
                delay: Math.floor(Math.random() * 3000),
                delayCount: Math.floor(Math.random() * 2000), // Different initial states
            })),
        }));
        setStars(initialStars);
        
        // Define handleResize outside the conditional block
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };
        
        // Setup constellation canvas
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            constellationRef.current = ctx;
            
            // Set canvas to full screen
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            window.addEventListener('resize', handleResize);
            
            // Animation for constellation lines
            const animateConstellation = () => {
                if (!ctx) return;
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 0.5;
                
                // Draw lines between stars that are close to each other
                for (let i = 0; i < stars.length; i++) {
                    for (let j = i + 1; j < stars.length; j++) {
                        const dx = stars[i].x - stars[j].x;
                        const dy = stars[i].y - stars[j].y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < 150) {
                            ctx.beginPath();
                            ctx.moveTo(stars[i].x, stars[i].y);
                            ctx.lineTo(stars[j].x, stars[j].y);
                            ctx.stroke();
                        }
                    }
                }
                
                // Animate stars slightly
                setStars(prevStars => 
                    prevStars.map(star => {
                        const pulsate = star.pulsate * Math.sin(Date.now() * star.pulsateSpeed);
                        
                        // Handle multiple ripples for each star
                        let updatedRipples = star.ripples || [];
                        if (star.ripple && updatedRipples.length > 0) {
                            updatedRipples = updatedRipples.map(ripple => {
                                let { size, opacity, active, delay, delayCount, maxSize, speed, maxOpacity } = ripple;
                                
                                // Handle delay before activating ripple
                                if (!active) {
                                    delayCount += 16; // Approximate ms per frame
                                    if (delayCount >= delay) {
                                        active = true;
                                    }
                                }
                                
                                // Animate ripple if it's active
                                if (active) {
                                    size += speed;
                                    
                                    // Calculate opacity based on size - start fading after reaching 30% size
                                    if (size < maxSize * 0.3) {
                                        opacity = Math.min(maxOpacity, opacity + 0.01);
                                    } else {
                                        opacity = maxOpacity * (1 - ((size - (maxSize * 0.3)) / (maxSize * 0.7)));
                                    }
                                    
                                    // Reset ripple when it reaches max size to create continuous effect
                                    if (size >= maxSize) {
                                        size = 0;
                                        opacity = 0;
                                        delay = Math.floor(Math.random() * 2000);
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
                        
                        return {
                            ...star,
                            size: Math.max(0.5, star.size + pulsate),
                            x: star.x + (Math.random() - 0.5) * 0.1,
                            y: star.y + (Math.random() - 0.5) * 0.1,
                            ripples: updatedRipples,
                        };
                    })
                );
                
                requestAnimationFrame(animateConstellation);
            };
            animateConstellation();
        }
        
        // Scroll detection for section animations
        const handleScroll = () => {
            const scrollPosition = window.scrollY;
            if (scrollPosition > 200) setShowTeam(true);
            if (scrollPosition > 700) setShowProject(true);
            if (scrollPosition > 1200) setShowHowItWorks(true);
        };

        window.addEventListener('scroll', handleScroll);
        
        // Cleanup
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Monochrome theme
    const theme = {
        palette: {
            primary: {
                main: '#ffffff',
                light: '#ffffff',
                dark: '#cccccc',
            },
            background: {
                default: '#000000',
                paper: '#111111',
            },
            text: {
                primary: '#ffffff',
                secondary: '#aaaaaa',
            },
            action: {
                hover: 'rgba(255, 255, 255, 0.2)',
            }
        },
    };

    const styles = {
        landingPage: {
            fontFamily: '"Inter", "Roboto", sans-serif',
            padding: 0,
            margin: 0,
            background: '#000000',
            color: theme.palette.text.primary,
            overflow: 'hidden',
            position: 'relative',
        },
        starsCanvas: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0,
        },
        star: {
            position: 'fixed',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 0 10px 2px rgba(255, 255, 255, 0.2)',
            pointerEvents: 'none',
        },
        starRipple: {
            position: 'fixed',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            pointerEvents: 'none',
            zIndex: 0,
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, rgba(0, 0, 0, 0) 70%)',
        },
        heroSection: {
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
            zIndex: 1,
        },
        heroOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle at center, rgba(40, 40, 40, 1) 0%, rgba(0, 0, 0, 1) 70%)',
            zIndex: -1,
        },
        heroLogo: {
            fontSize: '5rem',
            color: theme.palette.primary.main,
            marginBottom: '20px',
            filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.5))',
        },
        heroTitle: {
            fontSize: '4.5rem',
            fontWeight: '900',
            letterSpacing: '-0.05em',
            textTransform: 'uppercase',
            marginBottom: '20px',
            color: theme.palette.primary.main,
            textShadow: '0 0 30px rgba(255, 255, 255, 0.3)',
            borderBottom: '2px solid #ffffff',
            paddingBottom: '10px',
        },
        heroText: {
            fontSize: '1.5rem',
            color: theme.palette.text.secondary,
            textAlign: 'center',
            maxWidth: '800px',
            marginBottom: '40px',
            fontWeight: '300',
            letterSpacing: '0.05em',
        },
        heroButton: {
            backgroundColor: 'transparent',
            color: '#fff',
            padding: '15px 35px',
            fontSize: '1.2rem',
            border: '2px solid #ffffff',
            borderRadius: '0',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            letterSpacing: '0.1em',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden',
            marginTop: '10px',
            '&:hover': {
                backgroundColor: '#ffffff',
                color: '#000000',
                transform: 'translateY(-5px)',
                boxShadow: '0 10px 20px rgba(0, 0, 0, 0.3)',
            },
            '&::after': {
                content: '""',
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: 'linear-gradient(transparent, rgba(255, 255, 255, 0.1), transparent)',
                transform: 'rotate(45deg) translateX(-100%)',
                transition: 'all 0.6s ease',
            },
            '&:hover::after': {
                transform: 'rotate(45deg) translateX(100%)',
            },
        },
        section: {
            padding: '120px 20px',
            opacity: 0,
            transform: 'translateY(30px)',
            transition: 'opacity 1s ease, transform 1s ease',
            position: 'relative',
            zIndex: 1,
        },
        visibleSection: {
            opacity: 1,
            transform: 'translateY(0)',
        },
        sectionTitle: {
            fontSize: '3.5rem',
            fontWeight: '900',
            letterSpacing: '-0.03em',
            marginBottom: '60px',
            textAlign: 'center',
            color: theme.palette.primary.main,
            position: 'relative',
            display: 'inline-block',
            left: '50%',
            transform: 'translateX(-50%)',
            '&::after': {
                content: '""',
                position: 'absolute',
                bottom: '-10px',
                left: '25%',
                width: '50%',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #ffffff, transparent)',
            },
        },
        sectionText: {
            fontSize: '1.2rem',
            lineHeight: '1.8',
            maxWidth: '1000px',
            margin: '0 auto 80px auto',
            color: theme.palette.text.secondary,
            textAlign: 'center',
            padding: '0 20px',
            fontWeight: '300',
            letterSpacing: '0.02em',
        },
        teamContainer: {
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '40px',
            maxWidth: '1200px',
            margin: '0 auto',
        },
        projectFeatures: {
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '40px',
            maxWidth: '1200px',
            margin: '0 auto',
        },
        featureCard: {
            backgroundColor: '#111111',
            borderRadius: '0',
            padding: '40px',
            width: '300px',
            boxShadow: '0 15px 30px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.5s ease',
            border: '1px solid #222222',
            '&:hover': {
                transform: 'translateY(-15px)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
                borderColor: '#444444',
            },
            position: 'relative',
            overflow: 'hidden',
            '&::after': {
                content: '""',
                position: 'absolute',
                top: '-100%',
                left: '-100%',
                width: '80%',
                height: '80%',
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, rgba(0, 0, 0, 0) 70%)',
                transition: 'all 0.8s ease',
            },
            '&:hover::after': {
                top: '-30%',
                left: '-30%',
            },
        },
        featureIcon: {
            fontSize: '3.5rem',
            color: theme.palette.primary.main,
            marginBottom: '25px',
            filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.3))',
        },
        featureTitle: {
            fontSize: '1.8rem',
            fontWeight: 'bold',
            marginBottom: '20px',
            color: theme.palette.text.primary,
            position: 'relative',
            paddingBottom: '15px',
            '&::after': {
                content: '""',
                position: 'absolute',
                bottom: '0',
                left: '0',
                width: '40px',
                height: '2px',
                backgroundColor: theme.palette.primary.main,
            },
        },
        featureText: {
            fontSize: '1rem',
            color: theme.palette.text.secondary,
            lineHeight: '1.8',
        },
        stepsContainer: {
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '1200px',
            margin: '0 auto',
            gap: '100px',
        },
        stepRow: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '60px',
            '@media (max-width: 900px)': {
                flexDirection: 'column',
                textAlign: 'center',
            },
        },
        stepRowReverse: {
            flexDirection: 'row-reverse',
            '@media (max-width: 900px)': {
                flexDirection: 'column',
                textAlign: 'center',
            },
        },
        stepContent: {
            flex: 1,
        },
        stepNumber: {
            display: 'inline-block',
            width: '50px',
            height: '50px',
            lineHeight: '46px',
            textAlign: 'center',
            color: '#ffffff',
            borderRadius: '0',
            marginRight: '15px',
            fontWeight: 'bold',
            fontSize: '1.5rem',
            border: '2px solid #ffffff',
            boxShadow: '0 0 15px rgba(255, 255, 255, 0.3)',
        },
        stepTitle: {
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '25px',
            color: theme.palette.text.primary,
            display: 'flex',
            alignItems: 'center',
            '@media (max-width: 900px)': {
                justifyContent: 'center',
            },
            letterSpacing: '-0.02em',
        },
        stepDescription: {
            fontSize: '1.2rem',
            color: theme.palette.text.secondary,
            lineHeight: '1.8',
            maxWidth: '500px',
            fontWeight: '300',
            letterSpacing: '0.02em',
        },
        stepIconContainer: {
            flex: 1,
            maxWidth: '400px',
            height: '300px',
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        },
        stepIcon: {
            fontSize: '9rem',
            color: theme.palette.primary.main,
            filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))',
        },
        stepIconBg: {
            position: 'absolute',
            width: '250px',
            height: '250px',
            background: 'radial-gradient(circle, rgba(40, 40, 40, 1) 0%, rgba(0, 0, 0, 0) 70%)',
            animation: 'pulse 4s infinite',
            '@keyframes pulse': {
                '0%': { transform: 'scale(0.95)', opacity: 0.7 },
                '50%': { transform: 'scale(1.05)', opacity: 0.9 },
                '100%': { transform: 'scale(0.95)', opacity: 0.7 },
            },
        },
        connectingLine: {
            position: 'absolute',
            left: '50%',
            top: '-50px',
            width: '2px',
            height: '100px',
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0))',
            zIndex: 0,
        },
        // Animated border for step indicators
        animatedBorder: {
            position: 'absolute',
            width: '100%',
            height: '100%',
            top: '0',
            left: '0',
            border: '2px solid transparent',
            borderImageSlice: 1,
            animation: 'borderAnimation 8s linear infinite',
            '@keyframes borderAnimation': {
                '0%': { borderImageSource: 'linear-gradient(90deg, #ffffff, #444444, #ffffff)' },
                '50%': { borderImageSource: 'linear-gradient(180deg, #ffffff, #444444, #ffffff)' },
                '100%': { borderImageSource: 'linear-gradient(270deg, #ffffff, #444444, #ffffff)' },
            },
        },
    };

    return (
        <div style={styles.landingPage}>
            {/* Constellation Canvas */}
            <canvas ref={canvasRef} style={styles.starsCanvas}></canvas>
            
            {/* Stars with Continuous Ripple Effects */}
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

            {/* Hero Section */}
            <section style={styles.heroSection}>
                <div style={styles.heroOverlay}></div>
                <Fade in={heroLoaded} timeout={1000}>
                    <div style={{ textAlign: 'center' }}>
                        <Zoom in={heroLoaded} timeout={1500}>
                            <div>
                                <PrintIcon style={styles.heroLogo} />
                            </div>
                        </Zoom>
                        <Fade in={heroLoaded} timeout={1500} style={{ transitionDelay: '500ms' }}>
                            <h1 style={styles.heroTitle}>
                                PolyPrint 3D
                            </h1>
                        </Fade>
                        <Fade in={heroLoaded} timeout={1500} style={{ transitionDelay: '800ms' }}>
                            <p style={styles.heroText}>
                                Revolutionizing 3D printing with unparalleled speed and efficiency. 
                                Multiple printers, one seamless experience.
                            </p>
                        </Fade>
                        <Fade in={heroLoaded} timeout={1500} style={{ transitionDelay: '1100ms' }}>
                            <div>
                            {user ? (
                                <Button
                                    variant="outlined"
                                    component={Link}
                                    to="/"
                                    style={styles.heroButton}
                                    startIcon={<AutoFixHighIcon />}
                                >
                                    Start Printing
                                </Button>
                            ) : (
                                <Button
                                    variant="outlined"
                                    component={Link}
                                    to="/authPage"
                                    style={styles.heroButton}
                                    startIcon={<AutoFixHighIcon />}
                                >
                                    Login to Start Printing
                                </Button>
                            )}
                            </div>
                        </Fade>
                    </div>
                </Fade>
            </section>

            {/* Team Section */}
            <section
                style={{
                    ...styles.section,
                    ...(showTeam ? styles.visibleSection : {}),
                    background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)',
                }}
            >
                <Container>
                    <Typography variant="h2" component="h2" style={styles.sectionTitle}>
                        Meet the Team
                    </Typography>
                    <Typography style={styles.sectionText}>
                        Wij zijn een gedreven team met een passie voor technologie en innovatie! <br />
                        <strong>Rand</strong>, onze projectleider, is een enthousiaste machine learning- en AI-liefhebber die graag nieuwe uitdagingen aangaat. <br />
                        <strong>Antoine</strong> beheert de 3D-printers en brengt ervaring in 3D-printing en machinebeheer mee. <br />
                        <strong>Yasmine</strong> is een toegewijde en flexibele developer met een sterke expertise in de backend. Haar probleemoplossend vermogen en doorzettingskracht maken haar een onmisbare schakel in ons team. <br />
                        <strong>Nour</strong> is de creatieve geest van het team en een expert in frontend-ontwikkeling. Haar innovatieve ideeën en oog voor detail zorgen voor een gebruiksvriendelijke en efficiënte interface. <br />
                        Met grote dank aan <strong>Maarten Dequanter</strong>, die ons heeft geïnspireerd en begeleid bij het vormgeven van dit project. Ook willen we <strong>Karel en Laurence van de ICT-dienst in EhB</strong> bedanken voor hun waardevolle steun en hulp gedurende het traject.
                    </Typography>
                </Container>
            </section>

            {/* Project Section */}
            <section
                style={{
                    ...styles.section,
                    ...(showProject ? styles.visibleSection : {}),
                    background: 'linear-gradient(180deg, #0a0a0a 0%, #000000 100%)',
                }}
            >
                <Container>
                    <Typography variant="h2" component="h2" style={styles.sectionTitle}>
                        About PolyPrint 3D
                    </Typography>
                    <Typography style={styles.sectionText}>
                        PolyPrint 3D is a software solution that significantly speeds up the 3D printing process 
                        by intelligently distributing print tasks across multiple printers. Instead of having one 
                        printer process an entire set of components, our software analyzes the uploaded file, 
                        automatically splits it into separate components, and sends each part simultaneously to 
                        available printers.
                    </Typography>
                    
                    <div style={styles.projectFeatures}>
                        <Fade in={showProject} timeout={1500} style={{ transitionDelay: '200ms' }}>
                            <Card style={styles.featureCard}>
                                <SpeedIcon style={styles.featureIcon} />
                                <Typography style={styles.featureTitle}>Lightning Fast</Typography>
                                <Typography style={styles.featureText}>
                                    Drastically reduce total printing time by distributing components across multiple printers simultaneously.
                                </Typography>
                            </Card>
                        </Fade>
                        
                        <Fade in={showProject} timeout={1500} style={{ transitionDelay: '400ms' }}>
                            <Card style={styles.featureCard}>
                                <AutoFixHighIcon style={styles.featureIcon} />
                                <Typography style={styles.featureTitle}>Smart Automation</Typography>
                                <Typography style={styles.featureText}>
                                    Automatic file analysis and component separation with intelligent printer allocation algorithms.
                                </Typography>
                            </Card>
                        </Fade>
                        
                        <Fade in={showProject} timeout={1500} style={{ transitionDelay: '600ms' }}>
                            <Card style={styles.featureCard}>
                                <GroupsIcon style={styles.featureIcon} />
                                <Typography style={styles.featureTitle}>Team Efficiency</Typography>
                                <Typography style={styles.featureText}>
                                    Perfect for robotics labs or production environments that regularly need 3D printed components.
                                </Typography>
                            </Card>
                        </Fade>
                    </div>
                </Container>
            </section>

            {/* How It Works Section */}
            <section
                style={{
                    ...styles.section,
                    ...(showHowItWorks ? styles.visibleSection : {}),
                    background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)',
                    paddingBottom: '150px',
                }}
            >
                <Container>
                    <Typography variant="h2" component="h2" style={styles.sectionTitle}>
                        How It Works
                    </Typography>
                    
                    <div style={styles.stepsContainer}>
                        <div style={styles.stepRow}>
                            <div style={styles.stepContent}>
                                <Fade in={showHowItWorks} timeout={1000} style={{ transitionDelay: '200ms' }}>
                                    <div>
                                        <Typography style={styles.stepTitle}>
                                            <span style={styles.stepNumber}>1</span>
                                            Upload Your File
                                        </Typography>
                                        <Typography style={styles.stepDescription}>
                                            Simply upload your 3D model file to our platform. Our system 
                                            will automatically begin processing it for distributed printing.
                                        </Typography>
                                    </div>
                                </Fade>
                            </div>
                            <div style={styles.stepIconContainer}>
                                <Zoom in={showHowItWorks} timeout={1000} style={{ transitionDelay: '300ms' }}>
                                    <div style={styles.stepIconBg}></div>
                                </Zoom>
                                <Fade in={showHowItWorks} timeout={1500} style={{ transitionDelay: '500ms' }}>
                                    <UploadFileIcon style={styles.stepIcon} />
                                </Fade>
                            </div>
                        </div>
                        
                        <div style={{...styles.stepRow, ...styles.stepRowReverse}}>
                            <div style={styles.stepContent}>
                                <Fade in={showHowItWorks} timeout={1000} style={{ transitionDelay: '400ms' }}>
                                    <div>
                                        <Typography style={styles.stepTitle}>
                                            <span style={styles.stepNumber}>2</span>
                                            Automatic Slicing
                                        </Typography>
                                        <Typography style={styles.stepDescription}>
                                            The file is sent to our advanced slicer, which scans and intelligently 
                                            divides it into printable parts optimized for parallel processing.
                                        </Typography>
                                    </div>
                                </Fade>
                            </div>
                            <div style={styles.stepIconContainer}>
                                <div style={styles.connectingLine}></div>
                                <Zoom in={showHowItWorks} timeout={1000} style={{ transitionDelay: '500ms' }}>
                                    <div style={styles.stepIconBg}></div>
                                </Zoom>
                                <Fade in={showHowItWorks} timeout={1500} style={{ transitionDelay: '700ms' }}>
                                    <ContentCutIcon style={styles.stepIcon} />
                                </Fade>
                            </div>
                        </div>
                        
                        <div style={styles.stepRow}>
                            <div style={styles.stepContent}>
                                <Fade in={showHowItWorks} timeout={1000} style={{ transitionDelay: '600ms' }}>
                                    <div>
                                        <Typography style={styles.stepTitle}>
                                            <span style={styles.stepNumber}>3</span>
                                            Printer Allocation
                                        </Typography>
                                        <Typography style={styles.stepDescription}>
                                            Our intelligent system assigns the parts to available printers 
                                            based on printer capabilities, component complexity, and current workload.
                                        </Typography>
                                    </div>
                                </Fade>
                            </div>
                            <div style={styles.stepIconContainer}>
                                <div style={styles.connectingLine}></div>
                                <Zoom in={showHowItWorks} timeout={1000} style={{ transitionDelay: '700ms' }}>
                                    <div style={styles.stepIconBg}></div>
                                </Zoom>
                                <Fade in={showHowItWorks} timeout={1500} style={{ transitionDelay: '900ms' }}>
                                    <DeviceHubIcon style={styles.stepIcon} />
                                </Fade>
                            </div>
                        </div>
                        
                        <div style={{...styles.stepRow, ...styles.stepRowReverse}}>
                            <div style={styles.stepContent}>
                                <Fade in={showHowItWorks} timeout={1000} style={{ transitionDelay: '800ms' }}>
                                    <div>
                                        <Typography style={styles.stepTitle}>
                                            <span style={styles.stepNumber}>4</span>
                                            Faster Printing
                                        </Typography>
                                        <Typography style={styles.stepDescription}>
                                            With multiple printers working in parallel, your project is completed 
                                            in record time - often reducing printing time by 70% or more compared 
                                            to traditional methods.
                                        </Typography>
                                    </div>
                                </Fade>
                            </div>
                            <div style={styles.stepIconContainer}>
                                <div style={styles.connectingLine}></div>
                                <Zoom in={showHowItWorks} timeout={1000} style={{ transitionDelay: '900ms' }}>
                                    <div style={styles.stepIconBg}></div>
                                </Zoom>
                                <Fade in={showHowItWorks} timeout={1500} style={{ transitionDelay: '1100ms' }}>
                                    <RocketLaunchIcon style={styles.stepIcon} />
                                </Fade>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* Footer with subtle animation */}
            <footer style={{
                padding: '50px 0',
                backgroundColor: '#050505',
                borderTop: '1px solid #222',
                position: 'relative',
                overflow: 'hidden',
                zIndex: 1
            }}>
                <Container>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        position: 'relative'
                    }}>
                        <PrintIcon style={{
                            fontSize: '3rem',
                            color: '#ffffff',
                            marginBottom: '20px'
                        }} />
                        
                        <Typography variant="h5" style={{
                            fontSize: '1.8rem',
                            fontWeight: '700',
                            marginBottom: '10px',
                            letterSpacing: '0.05em'
                        }}>
                            PolyPrint 3D
                        </Typography>
                        
                        <Typography style={{
                            fontSize: '1rem',
                            color: '#aaaaaa',
                            maxWidth: '600px',
                            margin: '0 auto 30px auto'
                        }}>
                            The future of distributed 3D printing is here.
                            Join us in revolutionizing production efficiency.
                        </Typography>
                        
                        <Button
                            variant="outlined"
                            component={Link}
                            to="/contact"
                            style={{
                                border: '1px solid #ffffff',
                                color: '#ffffff',
                                padding: '10px 25px',
                                borderRadius: '0',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                fontSize: '0.9rem',
                                marginBottom: '30px',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    backgroundColor: '#ffffff',
                                    color: '#000000'
                                }
                            }}
                        >
                            Contact Us
                        </Button>
                        
                        <Typography style={{
                            fontSize: '0.8rem',
                            color: '#555555'
                        }}>
                            © {new Date().getFullYear()} PolyPrint 3D. All rights reserved.
                        </Typography>
                        
                        {/* Animated lines in footer */}
                        <div style={{
                            position: 'absolute',
                            bottom: '-50px',
                            left: '0',
                            width: '100%',
                            height: '150px',
                            background: 'linear-gradient(0deg, transparent, #111111, transparent)',
                            transform: 'skewY(-5deg)',
                            zIndex: -1
                        }}></div>
                    </div>
                </Container>
            </footer>
        </div>
    );
};

export default Landing;