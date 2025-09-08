import React from 'react';
import { Route } from 'react-router-dom';
import NFCScanner from './NFCScanner';
 
const NFCScannerRoute = () => {
    return (
<Route path="/nfc-scanner" component={NFCScanner} />
    );
};
 
export default NFCScannerRoute;