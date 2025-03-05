import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';

const Landing = ({ user }) => {
    const [showTeam, setShowTeam] = useState(false);
    const [showProject, setShowProject] = useState(false);
    const [showHowItWorks, setShowHowItWorks] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY;
            if (scrollPosition > 100) setShowTeam(true);
            if (scrollPosition > 400) setShowProject(true);
            if (scrollPosition > 800) setShowHowItWorks(true);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Inline styles
    const styles = {
        landingPage: {
            fontFamily: 'Arial, sans-serif',
            padding: '20px',
        },
        heroSection: {
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f0f0f0',
        },
        heroTitle: {
            fontSize: '3rem',
            marginBottom: '20px',
        },
        heroText: {
            fontSize: '1.5rem',
            color: '#555',
        },
        section: {
            padding: '60px 20px',
            opacity: 0,
            transform: 'translateY(50px)',
            transition: 'opacity 1s ease, transform 1s ease',
        },
        visibleSection: {
            opacity: 1,
            transform: 'translateY(0)',
        },
        sectionTitle: {
            fontSize: '2.5rem',
            marginBottom: '20px',
            textAlign: 'center'
        },
        sectionText: {
            fontSize: '1.2rem',
            lineHeight: '1.6',
            maxWidth: '800px',
            margin: '0 auto',
        },
        stepsContainer: {
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '20px',
        },
        step: {
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '10px',
            padding: '20px',
            width: '250px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        },
        stepTitle: {
            fontSize: '1.5rem',
            marginBottom: '10px',
        },
        stepText: {
            fontSize: '1rem',
            color: '#555',
        },
    };

    return (
        <div style={styles.landingPage}>
            {/* Hero Section */}
            <section style={styles.heroSection}>
                <h1 style={styles.heroTitle}>Welcome to PolyPrint 3D</h1>
                <p style={styles.heroText}>Revolutionizing 3D printing with speed and efficiency.</p>
                {user ? (
                    <Button
                        variant="contained"
                        component={Link}
                        to="/"
                        sx={{ mt: 2 }}
                    >
                        Start Printing
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        component={Link}
                        to="/authPage"
                        sx={{ mt: 2 }}
                    >
                        Login to Start Printing
                    </Button>
                )}
            </section>

            {/* Team Section */}
            <section
                style={{
                    ...styles.section,
                    ...(showTeam ? styles.visibleSection : {}),
                }}
            >
                <h2 style={styles.sectionTitle}>Meet the Team</h2>
                <p style={styles.sectionText}>
                    Wij zijn een gedreven team met een passie voor technologie en innovatie! <br />
                    <strong>Rand</strong>, onze projectleider, is een enthousiaste machine learning- en AI-liefhebber die graag nieuwe uitdagingen aangaat. <br />
                    <strong>Antoine</strong> beheert de 3D-printers en brengt ervaring in 3D-printing en machinebeheer mee. <br />
                    <strong>Yasmine</strong> is een toegewijde en flexibele developer met een sterke expertise in de backend. Haar probleemoplossend vermogen en doorzettingskracht maken haar een onmisbare schakel in ons team. <br />
                    <strong>Nour</strong> is de creatieve geest van het team en een expert in frontend-ontwikkeling. Haar innovatieve ideeën en oog voor detail zorgen voor een gebruiksvriendelijke en efficiënte interface. <br />
                    Met grote dank aan <strong>Maarten Dequanter</strong>, die ons heeft geïnspireerd en begeleid bij het vormgeven van dit project. Ook willen we <strong>Karel en Laurence van de ICT-dienst in EhB</strong> bedanken voor hun waardevolle steun en hulp gedurende het traject.                
                </p>
            </section>

            {/* Project Section */}
            <section
                style={{
                    ...styles.section,
                    ...(showProject ? styles.visibleSection : {}),
                }}
            >
                <h2 style={styles.sectionTitle}>About PolyPrint 3D</h2>
                <p style={styles.sectionText}>
                    PolyPrint 3D is een softwareoplossing die het 3D-printproces aanzienlijk versnelt door printtaken slim te verdelen over meerdere printers. In plaats van één printer een volledige set onderdelen te laten verwerken, analyseert onze software het geüploade bestand, splitst het automatisch in afzonderlijke componenten en stuurt elk onderdeel gelijktijdig naar beschikbare printers.<br />
                    
                    <br />Dit zorgt voor een drastische vermindering van de totale printtijd, wat vooral voordelig is voor gebruikers die regelmatig 3D-geprinte onderdelen nodig hebben, zoals in roboticalabs of productieomgevingen. Dankzij deze efficiënte taakverdeling wordt kostbare tijd bespaard en kan het printproces veel sneller verlopen.                
                </p>
            </section>

            {/* How It Works Section */}
            <section
                style={{
                    ...styles.section,
                    ...(showHowItWorks ? styles.visibleSection : {}),
                }}
            >
                <h2 style={styles.sectionTitle}>How It Works</h2>
                <div style={styles.stepsContainer}>
                    <div style={styles.step}>
                        <h3 style={styles.stepTitle}>Step 1: Upload Your File</h3>
                        <p style={styles.stepText}>Upload your 3D model file to our platform. Our system will automatically process it.</p>
                    </div>
                    <div style={styles.step}>
                        <h3 style={styles.stepTitle}>Step 2: Automatic Slicing</h3>
                        <p style={styles.stepText}>The file is sent to the slicer, which scans and divides it into printable parts.</p>
                    </div>
                    <div style={styles.step}>
                        <h3 style={styles.stepTitle}>Step 3: Printer Allocation</h3>
                        <p style={styles.stepText}>Our system assigns the parts to available printers for simultaneous printing.</p>
                    </div>
                    <div style={styles.step}>
                        <h3 style={styles.stepTitle}>Step 4: Faster Printing</h3>
                        <p style={styles.stepText}>With multiple printers working together, your project is completed in record time.</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Landing;