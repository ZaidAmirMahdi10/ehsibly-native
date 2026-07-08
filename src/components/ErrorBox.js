import InfoBox from './InfoBox';

// Named wrapper around InfoBox's error variant, so call sites read by intent
// instead of passing isError/variant props directly.
const ErrorBox = props => <InfoBox {...props} variant="error" />;

export default ErrorBox;
