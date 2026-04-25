const testCases = [
  "Podcast bölümü hazırlamak istiyorum",
  "YouTube videosu çekmek istiyorum",
  "Blog yazısı yazmak istiyorum",
  "x"
];

async function runTests() {
  for (const prompt of testCases) {
    console.log(`\n\n--- TEST: "${prompt}" ---`);
    try {
      const resp = await fetch('http://localhost:3000/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, pricingFilter: 'all' })
      });
      
      const text = await resp.text();
      const chunks = text.trim().split('\n');
      
      let type = 'unknown';
      let mainData = null;
      let workflowData = null;

      for (const chunkStr of chunks) {
        if (!chunkStr) continue;
        try {
          const chunk = JSON.parse(chunkStr);
          if (chunk.type === 'workflow') {
             type = 'workflow';
             workflowData = chunk.workflow;
          } else if (chunk.type === 'simple' && chunk.chunk === 'main') {
             type = 'simple';
             mainData = chunk.main;
          } else if (chunk.error) {
             type = 'error';
             mainData = chunk.error;
          }
        } catch(e) {}
      }

      console.log(`Sonuç Tipi: ${type}`);
      if (type === 'workflow' && workflowData) {
        console.log(`Workflow Adı: ${workflowData.name}`);
        console.log(`Adım Sayısı: ${workflowData.totalSteps}`);
        workflowData.steps.forEach(s => {
          console.log(`  - Adım ${s.order}: ${s.name} (${s.primary?.toolName || 'Yok'})`);
        });
      } else if (type === 'simple' && mainData) {
        console.log(`Önerilen Araç: ${mainData.toolName || mainData}`);
      } else if (type === 'error') {
        console.log(`Hata: ${mainData}`);
      } else {
        console.log(`Ham Dönüş Parçası: ${chunks[0].substring(0, 50)}...`);
      }
    } catch (e) {
      console.log(`Hata oluştu: ${e.message}`);
    }
  }
}

runTests();
