import React, { useEffect, useState } from 'react';
import { 
   Box, 
   Alert, 
   Container, 
   Typography, 
   Stepper, 
   Step, 
   StepLabel,
   CircularProgress 
} from '@mui/material';
import PrintSettings from './components/PrintSettings';
import STLFileUpload from './components/STLFileUpload';
import SlicedFilesPreview from './components/SlicedFilesPreview';
import PrintingProgress from './components/PrintProgress';

/**
* Workflow steps for the 3D printing process
*/
const WORKFLOW_STEPS = [
   'Upload STL File',
   'Configure Print Settings', 
   'Preview Slices',
   'Print Progress'
];

/**
* Main application component that manages the 3D printing workflow
*/
function App() {
   const [appState, setAppState] = useState({
       data: null,
       error: null,
       uploadedFile: null,
       slicingResult: null,
       printStarted: null,
       isLoading: false
   });

   /**
    * Determines the current active step in the workflow
    * @returns {number} Index of the current step
    */
   const getActiveStep = () => {
       if (!appState.uploadedFile) return 0;
       if (!appState.slicingResult) return 1;
       if (!appState.printStarted) return 2;
       return 3;
   };

   /**
    * Event handlers for workflow state changes
    */
   const handlers = {
       onFileUploaded: (fileData) => {
           setAppState(prev => ({
               ...prev,
               error: null,
               uploadedFile: fileData
           }));
       },

       onSlicingComplete: (result) => {
           setAppState(prev => ({
               ...prev,
               error: null,
               slicingResult: result
           }));
       },

       onPrintStart: (printData) => {
           setAppState(prev => ({
               ...prev,
               error: null,
               printStarted: printData
           }));
       },

       onReset: () => {
           setAppState(prev => ({
               data: prev.data,
               error: null,
               uploadedFile: null,
               slicingResult: null,
               printStarted: null,
               isLoading: false
           }));
       },

       onError: (errorMessage) => {
           setAppState(prev => ({
               ...prev,
               error: errorMessage
           }));
       }
   };

   /**
    * Renders the current step component based on workflow state
    * @returns {JSX.Element} Current step component
    */
   const renderCurrentStep = () => {
       if (!appState.uploadedFile) {
           return <STLFileUpload onFileUploaded={handlers.onFileUploaded} />;
       }
       
       if (!appState.slicingResult) {
           return (
               <PrintSettings
                   fileData={appState.uploadedFile}
                   onSlicingComplete={handlers.onSlicingComplete}
                   onReset={handlers.onReset}
               />
           );
       }
       
       if (!appState.printStarted) {
           return (
               <SlicedFilesPreview
                   slicingResult={appState.slicingResult}
                   onPrintStart={handlers.onPrintStart}
                   onReset={handlers.onReset}
               />
           );
       }
       
       return (
           <PrintingProgress
               selectedFiles={appState.printStarted}
               onReset={handlers.onReset}
               onError={handlers.onError}
           />
       );
   };

   // Loading state
   if (appState.isLoading) {
       return (
           <Container maxWidth="lg">
               <Box sx={{ 
                   display: 'flex', 
                   justifyContent: 'center', 
                   alignItems: 'center', 
                   minHeight: '100vh' 
               }}>
                   <CircularProgress />
               </Box>
           </Container>
       );
   }

   return (
       <Container maxWidth="lg">
           <Box sx={{ py: 4 }}>
               {/* Header */}
               <Box sx={{ mb: 4, textAlign: 'center' }}>
                   <Typography variant="h3" component="h1" gutterBottom>
                       3D Print Workflow
                   </Typography>
                   {appState.data && (
                       <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                           {appState.data}
                       </Typography>
                   )}
               </Box>

               {/* Stepper */}
               <Stepper 
                   activeStep={getActiveStep()} 
                   sx={{ mb: 4 }}
                   alternativeLabel
               >
                   {WORKFLOW_STEPS.map((label) => (
                       <Step key={label}>
                           <StepLabel>{label}</StepLabel>
                       </Step>
                   ))}
               </Stepper>

               {/* Error Display */}
               {appState.error && (
                   <Alert 
                       severity="error" 
                       sx={{ mb: 3 }}
                       onClose={() => setAppState(prev => ({ ...prev, error: null }))}
                   >
                       {appState.error}
                   </Alert>
               )}

               {/* Main Content */}
               <Box 
                   sx={{ 
                       width: '100%', 
                       p: 2,
                       minHeight: '60vh',
                       display: 'flex',
                       flexDirection: 'column',
                       justifyContent: 'center'
                   }}
               >
                   {renderCurrentStep()}
               </Box>
           </Box>
       </Container>
   );
}

export default App;