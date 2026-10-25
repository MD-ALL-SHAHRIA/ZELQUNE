/** Same rule as the gateway (createTeamMemberSchema): 10+ characters, letters and numbers. */
export function passwordProblem(password: string): 'password' | null {
  return password.length >= 10 && /[a-zA-Z]/.test(password) && /\d/.test(password)
    ? null
    : 'password';
}
