// ===================================
// LÓGICA DA APLICAÇÃO
// ===================================

document.addEventListener("DOMContentLoaded", populateClientSelect);

function populateClientSelect() {
  const select = document.getElementById("clientSelect");
  if (typeof clientData === 'undefined') {
    console.error("ERRO: Arquivo templates.js não foi carregado.");
    return;
  }
  const clientNames = Object.keys(clientData); 
  clientNames.forEach(clientName => {
    const option = document.createElement("option");
    option.value = clientName;
    option.textContent = clientName;
    select.appendChild(option);
  });
}

function autoFormat() {
  const rawHTML = document.getElementById("htmlInput").value;
  if (!rawHTML.trim()) return;

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHTML, "text/html");
  const trs = Array.from(doc.querySelectorAll("tr"));

  const output = trs.map(tr => {
    const tds = Array.from(tr.querySelectorAll("td"));
    const tdHTML = tds.map(td => {
      const img = td.querySelector("img");
      if (!img) return "";
      const width = img.getAttribute("width");
      const height = img.getAttribute("height");
      const src = img.getAttribute("src");
      return `
<td>
<a href="" title="">
<img src="${src}" width="${width}" height="${height}" alt="" border="0" style="display: block;">
</a>
</td>`;
    }).join("");

    return `<table align="center" border="0" cellpadding="0" cellspacing="0">
<tr>${tdHTML}
</tr>
</table>`;
  }).join("\n");

  document.getElementById("htmlInput").value = output;
}

function generateFields() {
  const countInput = document.getElementById("linkCount");
  if (!countInput.value) return; 
  
  const count = parseInt(countInput.value);
  const container = document.getElementById("fieldsContainer");
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    container.innerHTML += `
      <div class="row">
        <input type="text" placeholder="Link ${i + 1} (href)" class="link">
        <input type="text" placeholder="Alt/Title ${i + 1}" class="altTitle">
        <input type="text" placeholder="Source da Imagem ${i + 1} (src)" class="imgSrc"> 
      </div>`;
  }
}

function updateHTML() {
  // 1. Pega o HTML
  let bodyHtml = document.getElementById("htmlInput").value;
  
  // 2. Verifica configurações
  // "Não Adicionar" tem prioridade máxima
  const skipHeader = document.getElementById("noHeader").checked;
  const skipFooter = document.getElementById("noFooter").checked;

  let shouldReplaceHeader = document.getElementById("replaceHeader").checked;
  let shouldReplaceFooter = document.getElementById("replaceFooter").checked;

  // LÓGICA CRUCIAL: Se "Não adicionar" estiver marcado, forçamos "Não substituir"
  // Isso garante que "ele nao adiciona nada nem substitui"
  if (skipHeader) {
    shouldReplaceHeader = false;
  }
  if (skipFooter) {
    shouldReplaceFooter = false;
  }

  // Inputs de texto
  const subjectText = document.getElementById("emailSubject").value;
  const preheaderText = document.getElementById("emailPreheader").value;

  // 3. Lógica de REMOÇÃO de fatias antigas
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  let tables = bodyHtml.match(tableRegex);

  if (tables && tables.length > 0) {
    if (shouldReplaceHeader) {
      tables.shift(); 
    }
    if (shouldReplaceFooter && tables.length > 0) {
      tables.pop(); 
    }
    bodyHtml = tables.join("\n");
  } else {
    if(!bodyHtml) bodyHtml = ""; 
  }

  // --- LÓGICA DE LINKS ---
  const links = document.querySelectorAll(".link");
  const altTitles = document.querySelectorAll(".altTitle");
  const imgSrcs = document.querySelectorAll(".imgSrc");

  // Offset só acontece se realmente formos substituir/remover o header
  let inputOffset = shouldReplaceHeader ? 1 : 0;
  let index = 0;
  
  bodyHtml = bodyHtml.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, function(match) {
    const realInputIndex = index + inputOffset;
    if (realInputIndex >= links.length) return match; 

    const href = links[realInputIndex]?.value || "#";
    const altTitle = altTitles[realInputIndex]?.value || "";
    const newSrc = imgSrcs[realInputIndex]?.value;

    let updated = match
      .replace(/href="[^"]*"/, `href="${href}"`)
      .replace(/title="[^"]*"/, '')
      .replace(/<a/, `<a title="${altTitle}"`);

    updated = updated.replace(/<img\b[^>]*>/, img => {
      let newImg = img;
      if (newImg.includes('alt=')) {
        newImg = newImg.replace(/alt="[^"]*"/, `alt="${altTitle}"`);
      } else {
        newImg = newImg.replace(/<img/, `<img alt="${altTitle}"`);
      }
      if (newSrc && newSrc.trim() !== "") { 
        if (newImg.includes('src=')) {
          newImg = newImg.replace(/src="[^"]*"/, `src="${newSrc}"`);
        } else {
          newImg = newImg.replace(/<img/, `<img src="${newSrc}"`);
        }
      }
      return newImg;
    });
    index++;
    return updated;
  });

  // 4. Inserção do Template (Cliente)
  const selectedClient = document.getElementById("clientSelect").value;
  let finalHtml = "";
  
  // Variáveis para guardar header e footer do cliente
  let clientHeader = "";
  let clientFooter = "";

  if (selectedClient && clientData[selectedClient]) {
    // Só pega o header do cliente SE não estiver marcado para pular
    if (!skipHeader) {
      clientHeader = clientData[selectedClient].header;
    }
    
    // Só pega o footer do cliente SE não estiver marcado para pular
    if (!skipFooter) {
      clientFooter = clientData[selectedClient].footer;
    }
    
    // Monta o HTML final
    finalHtml = clientHeader + "\n" + bodyHtml + "\n" + clientFooter;
    
  } else {
    finalHtml = bodyHtml;
  }

  // 5. ATUALIZAÇÃO DO ASSUNTO (TITLE)
  // Só tenta substituir se tiver a tag <title> (ou seja, se o Header foi adicionado)
  if (subjectText && subjectText.trim() !== "") {
    finalHtml = finalHtml.replace(/<title>.*?<\/title>/i, `<title>${subjectText}</title>`);
  }

  // 6. INSERÇÃO DO SUB-ASSUNTO (PREHEADER)
  const textoFinalPreheader = preheaderText || "Digite aqui o sub assunto...";
  
  const subAssuntoDiv = `
<div style="text-align: center; border: 0;">
  <font size="1" face="Verdana" color="#FFFFFF">${textoFinalPreheader}</font>
</div>`;

  // Tenta injetar logo após o body
  if (finalHtml.match(/<body[^>]*>/i)) {
    finalHtml = finalHtml.replace(/(<body[^>]*>)/i, `$1\n${subAssuntoDiv}`);
  } else {
    // Se não tiver body (ex: header pulado), coloca no topo de tudo
    finalHtml = subAssuntoDiv + "\n" + finalHtml;
  }
  
  document.getElementById("updatedHTML").value = finalHtml;
}

function copiarHTML() {
  const texto = document.getElementById("updatedHTML").value;
  const msg = document.getElementById("msg");
  if (texto.trim() === "") {
    msg.textContent = "Nada para copiar!";
    msg.style.color = "red";
    return;
  }

  navigator.clipboard.writeText(texto)
    .then(() => {
      msg.textContent = "Copiado com sucesso!";
      msg.style.color = "green";
    })
    .catch(() => {
      msg.textContent = "Erro ao copiar.";
      msg.style.color = "red";
    });

  setTimeout(() => msg.textContent = "", 3000);
}