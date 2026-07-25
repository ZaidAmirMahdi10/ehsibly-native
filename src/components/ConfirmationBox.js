import InfoBox from './InfoBox';

// Named wrapper around InfoBox's success variant, so call sites read by
// intent instead of passing variant props directly.
const ConfirmationBox = props => <InfoBox {...props} variant="success" />;

export default ConfirmationBox;
