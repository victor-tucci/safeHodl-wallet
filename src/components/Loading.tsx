import Spinner from 'react-bootstrap/Spinner';


function Loading() {
    console.log("Loading is called..");
    return (
        <>
            <Spinner animation="border" variant="primary" />
        </>
    )
}

export default Loading;