import apiClient from './apiClient';

// POST /login — errors are intentionally left to reject/throw (unlike the
// web app's services, which swallow errors via console.error) so screens can
// render a real error message instead of silently doing nothing.
export const login = async (email, password, keepLogged = true) => {
  const response = await apiClient.post('/login', {
    email,
    password,
    keepLogged,
  });
  return response.data;
};

// POST /register — payload shape mirrors the web app's Register.js: an
// `organizationName` field routes the backend to create an Organization,
// a `username` field routes it to create an individual User. Returns
// {id, isOrganization} on success (used to kick off the resend-verification
// flow), or {error: <key>} on failure (emailAlreadyInUse/invalidPhoneNumber).
export const register = async payload => {
  const response = await apiClient.post('/register', payload);
  return response.data;
};

// POST /resend-verification-email — confirmed against the web app's
// Register.js. `language` picks which template getEmailConfig sends.
export const resendVerificationEmail = async ({id, isOrganization, language}) => {
  const response = await apiClient.post('/resend-verification-email', {
    id,
    isOrganization,
    language,
  });
  return response.data;
};

// Two distinct backend routes depending on login type (see AuthContext's
// normalizeSession): a bare "organization" login changes the Organization
// record's own password via orgId; an "orgUser" login changes that User
// record's password via userId. Both take the same {passwords: {current,
// new}} body shape and return {message}/{error: <key>} — the error keys
// (currentPasswordIsIncorrect, UserNotFound, OrganizationNotFound,
// failedToChangePassword) are meant to be run through t() by the caller.
export const changePassword = async ({userType, userId, organizationId, currentPassword, newPassword}) => {
  const passwords = {currentPassword, newPassword};

  if (userType === 'organization') {
    const response = await apiClient.post(
      '/api/org/changePassword',
      {passwords},
      {params: {orgId: organizationId}},
    );
    return response.data;
  }

  const response = await apiClient.post(`/user/${userId}/changepass`, {passwords});
  return response.data;
};
