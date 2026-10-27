async function inspect() {
  const resUsers = await fetch('http://localhost:3001/sellers/users');
  const htmlUsers = await resUsers.text();
  console.log('--- USERS HTML (first 1000 chars) ---');
  console.log(htmlUsers.slice(0, 1000));
  
  // Check for CSS link tags
  const cssMatches = htmlUsers.match(/<link[^>]*rel="stylesheet"[^>]*>/g) || [];
  console.log('CSS links:', cssMatches);

  // Check if any error text is in HTML
  if (htmlUsers.includes('Error') || htmlUsers.includes('error')) {
    const lines = htmlUsers.split('\n').filter(l => l.toLowerCase().includes('error'));
    console.log('Error lines:', lines.slice(0, 5));
  }

  // Fetch CSS files
  for (const link of cssMatches) {
    const hrefMatch = link.match(/href="([^"]+)"/);
    if (hrefMatch) {
      const cssRes = await fetch('http://localhost:3001' + hrefMatch[1]);
      const cssText = await cssRes.text();
      console.log(`CSS ${hrefMatch[1]} length: ${cssText.length}`);
    }
  }
}
inspect();
