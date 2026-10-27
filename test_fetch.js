async function test() {
  try {
    const res = await fetch('http://localhost:3001/sellers/users');
    console.log('/sellers/users status:', res.status);
    const text = await res.text();
    console.log('/sellers/users HTML length:', text.length);

    const res2 = await fetch('http://localhost:3001/product-submissions');
    console.log('/product-submissions status:', res2.status);
    const text2 = await res2.text();
    console.log('/product-submissions HTML length:', text2.length);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}
test();
