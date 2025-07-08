// Get logged in user's email
async function getUserEmail() {
  const response = await fetch('http://localhost:5000/api/auth/user', {
    credentials: 'include'
  });
  const user = await response.json();
  console.log('Logged in user email:', user.email);
  return user.email;
}
getUserEmail();
