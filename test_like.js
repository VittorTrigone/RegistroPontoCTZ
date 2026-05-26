const email1 = 'vi.trigone@gmail.com.adm';
const regex = new RegExp('.*@vi\\.trigone@gmail\\.com$');
console.log('Matches?', regex.test(email1));
