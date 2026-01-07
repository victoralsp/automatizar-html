// =================================================================
// CÓDIGO COMPLETO (LocalStorage + Modal + Mailbiz + Remove Spacer)
// =================================================================

function saveToLocalStorage() {
  const data = {
    htmlInput: document.getElementById("htmlInput").value,
    clientSelect: document.getElementById("clientSelect").value,
    replaceHeader: document.getElementById("replaceHeader").checked,
    noHeader: document.getElementById("noHeader").checked,
    replaceFooter: document.getElementById("replaceFooter").checked,
    noFooter: document.getElementById("noFooter").checked,
    emailSubject: document.getElementById("emailSubject").value,
    emailPreheader: document.getElementById("emailPreheader").value,
    mailbizCheck: document.getElementById("mailbizCheck").checked,
    replaceWidhtAndHeight: document.getElementById("replaceWidhtAndHeight").checked,
    generatedLinks: []
  };

  const links = document.querySelectorAll(".link");
  const altTitles = document.querySelectorAll(".altTitle");
  const imgSrcs = document.querySelectorAll(".imgSrc");

  links.forEach((_, i) => {
    data.generatedLinks.push({
      link: links[i].value,
      altTitle: altTitles[i].value,
      imgSrc: imgSrcs[i].value
    });
  });

  localStorage.setItem("automatizarHtmlData", JSON.stringify(data));
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem("automatizarHtmlData");
  if (!saved) return;

  const data = JSON.parse(saved);

  if (data.htmlInput) document.getElementById("htmlInput").value = data.htmlInput;
  if (data.clientSelect) document.getElementById("clientSelect").value = data.clientSelect;
  if (data.replaceHeader !== undefined) document.getElementById("replaceHeader").checked = data.replaceHeader;
  if (data.noHeader !== undefined) document.getElementById("noHeader").checked = data.noHeader;
  if (data.replaceFooter !== undefined) document.getElementById("replaceFooter").checked = data.replaceFooter;
  if (data.noFooter !== undefined) document.getElementById("noFooter").checked = data.noFooter;
  if (data.emailSubject) document.getElementById("emailSubject").value = data.emailSubject;
  if (data.emailPreheader) document.getElementById("emailPreheader").value = data.emailPreheader;
  if (data.mailbizCheck !== undefined) document.getElementById("mailbizCheck").checked = data.mailbizCheck;
  if (data.replaceWidhtAndHeight !== undefined) document.getElementById("replaceWidhtAndHeight").checked = data.replaceWidhtAndHeight;

  // Gera os inputs se houver HTML salvo
  if (data.htmlInput) {
    // Importante: Precisamos rodar o autoFormat antes ou depois? 
    // Como o HTML salvo já deve estar formatado, apenas geramos os campos.
    // Mas para garantir a contagem correta, usamos a função de gerar.

    // Pequeno ajuste: vamos contar quantas imagens TEM no HTML salvo para gerar os inputs
    // A função generateFields já faz isso lendo o valor do input.
    generateFields();
  }

  if (data.generatedLinks && data.generatedLinks.length > 0) {
    const links = document.querySelectorAll(".link");
    const altTitles = document.querySelectorAll(".altTitle");
    const imgSrcs = document.querySelectorAll(".imgSrc");

    data.generatedLinks.forEach((item, i) => {
      if (links[i]) links[i].value = item.link;
      if (altTitles[i]) altTitles[i].value = item.altTitle;
      if (imgSrcs[i]) imgSrcs[i].value = item.imgSrc;
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  populateClientSelect();
  loadFromLocalStorage();
  initModalDrag();

  const inputs = [
    "htmlInput", "clientSelect", "replaceHeader", "noHeader",
    "replaceFooter", "noFooter", "emailSubject", "emailPreheader",
    "mailbizCheck", "replaceWidhtAndHeight"
  ];

  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", saveToLocalStorage);
      el.addEventListener("change", saveToLocalStorage);
    }
  });
});

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

function incrementMailbizId(str) {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
  const strArr = str.split('');

  for (let i = strArr.length - 1; i >= 0; i--) {
    const char = strArr[i];
    const index = chars.indexOf(char);

    if (index !== -1) {
      if (index < chars.length - 1) {
        strArr[i] = chars[index + 1];
        break;
      } else {
        strArr[i] = chars[0];
      }
    } else {
      break;
    }
  }
  return strArr.join('');
}

// >>> FUNÇÃO ATUALIZADA COM REMOÇÃO DE SPACER.GIF <<<
function autoFormat() {
  const rawHTML = document.getElementById("htmlInput").value;
  if (!rawHTML.trim()) return;

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHTML, "text/html");
  const trs = Array.from(doc.querySelectorAll("tr"));

  const output = trs.map(tr => {
    const tds = Array.from(tr.querySelectorAll("td"));

    // Mapeia as células
    const tdHTML = tds.map(td => {
      const img = td.querySelector("img");
      if (!img) return "";

      const src = img.getAttribute("src");

      // >>> FILTRO ANTI-SPACER <<<
      // Se o src conter "spacer.gif", retorna vazio (apaga a célula)
      if (src && src.toLowerCase().includes("spacer.gif")) {
        return "";
      }

      const width = img.getAttribute("width");
      const height = img.getAttribute("height");

      return `
<td>
<a href="" title="">
<img src="${src}" width="${width}" height="${height}" alt="" border="0" style="display: block;">
</a>
</td>`;
    }).join(""); // Junta as células válidas

    // Se depois de filtrar os spacers a linha ficou vazia, não cria a tabela
    if (!tdHTML.trim()) return "";

    return `<table align="center" border="0" cellpadding="0" cellspacing="0">
<tr>${tdHTML}
</tr>
</table>`;
  })
    .filter(table => table !== "") // Remove as tabelas vazias do array final
    .join("\n");

  document.getElementById("htmlInput").value = output;

  // Salva no storage logo após formatar
  saveToLocalStorage();
}

function generateFields() {
  const htmlContent = document.getElementById("htmlInput").value;
  let count = 0;

  if (htmlContent.trim()) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    count = doc.querySelectorAll("img").length;
  }

  // Se count for 0, limpa e retorna
  if (count === 0) {
    document.getElementById("fieldsContainer").innerHTML = "";
    return;
  }

  const container = document.getElementById("fieldsContainer");

  // Verifica se o número de inputs já existentes é igual ao necessário para não recriar e perder dados?
  // Na sua lógica original, você sempre recria. Vamos manter assim para garantir integridade.
  // Se quiser preservar dados ao clicar em "Gerar Inputs" novamente, precisaria de lógica extra.
  // Como o loadFromLocalStorage preenche depois, está ok recriar aqui.

  container.innerHTML = "";

  for (let i = 0; i < count; i++) {
    container.innerHTML += `
      <div class="row">
        <input type="text" placeholder="Link ${i + 1} (href)" class="link">
        <input type="text" placeholder="Alt/Title ${i + 1}" class="altTitle">
        <input type="text" placeholder="Source da Imagem ${i + 1} (src)" class="imgSrc"> 
      </div>`;
  }

  const allImgInputs = document.querySelectorAll(".imgSrc");

  allImgInputs.forEach((input, index) => {
    input.addEventListener("input", function () {
      const isMailbizActive = document.getElementById("mailbizCheck").checked;

      if (isMailbizActive && this.value.trim() !== "") {
        let currentUrl = this.value;

        for (let j = index + 1; j < allImgInputs.length; j++) {
          const nextUrl = incrementMailbizId(currentUrl);
          allImgInputs[j].value = nextUrl;
          currentUrl = nextUrl;
        }
        // Salva após a automação preencher
        saveToLocalStorage();
      }
    });
  });

  const allGeneratedInputs = document.querySelectorAll(".link, .altTitle, .imgSrc");
  allGeneratedInputs.forEach(input => {
    input.addEventListener("input", saveToLocalStorage);
  });
}

function updateHTML() {
  let bodyHtml = document.getElementById("htmlInput").value;

  const skipHeader = document.getElementById("noHeader").checked;
  const skipFooter = document.getElementById("noFooter").checked;
  let shouldReplaceHeader = document.getElementById("replaceHeader").checked;
  let shouldReplaceFooter = document.getElementById("replaceFooter").checked;

  if (skipHeader) shouldReplaceHeader = false;
  if (skipFooter) shouldReplaceFooter = false;

  const subjectText = document.getElementById("emailSubject").value;
  const preheaderText = document.getElementById("emailPreheader").value;

  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  let tables = bodyHtml.match(tableRegex);

  if (tables && tables.length > 0) {
    if (shouldReplaceHeader) tables.shift();
    if (shouldReplaceFooter && tables.length > 0) tables.pop();

    const replaceAuto = document.getElementById("replaceWidhtAndHeight").checked;
    if (replaceAuto) {
      // Define range to apply replacement
      // If header is kept (!shouldReplaceHeader), Index 0 is Header -> Skip it (Start at 1)
      // If header is removed, Index 0 is Body -> Process it (Start at 0)
      let startIndex = !shouldReplaceHeader ? 1 : 0;

      // If footer is kept (!shouldReplaceFooter), Index Length-1 is Footer -> Skip it (End at Length-2)
      // If footer is removed, Index Length-1 is Body -> Process it (End at Length-1)
      let endIndex = !shouldReplaceFooter ? tables.length - 2 : tables.length - 1;

      for (let i = startIndex; i <= endIndex; i++) {
        if (tables[i]) {
          tables[i] = tables[i].replace(/width=(["'])(.*?)\1/gi, 'width="auto"');
          tables[i] = tables[i].replace(/height=(["'])(.*?)\1/gi, 'height="auto"');
        }
      }
    }

    bodyHtml = tables.join("\n");
  } else {
    if (!bodyHtml) bodyHtml = "";
  }

  const links = document.querySelectorAll(".link");
  const altTitles = document.querySelectorAll(".altTitle");
  const imgSrcs = document.querySelectorAll(".imgSrc");

  let inputOffset = shouldReplaceHeader ? 1 : 0;
  let index = 0;

  bodyHtml = bodyHtml.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, function (match) {
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

  const selectedClient = document.getElementById("clientSelect").value;
  let finalHtml = "";
  let clientHeader = "";
  let clientFooter = "";

  if (selectedClient && clientData[selectedClient]) {
    if (!skipHeader) clientHeader = clientData[selectedClient].header;
    if (!skipFooter) clientFooter = clientData[selectedClient].footer;
    finalHtml = clientHeader + "\n" + bodyHtml + "\n" + clientFooter;
  } else {
    finalHtml = bodyHtml;
  }

  if (subjectText && subjectText.trim() !== "") {
    finalHtml = finalHtml.replace(/<title>.*?<\/title>/i, `<title>${subjectText}</title>`);
  }

  const textoFinalPreheader = preheaderText || "";
  const subAssuntoDiv = `<div style="text-align: center; border: 0;"><font size="1" face="Verdana" color="#FFFFFF">${textoFinalPreheader}</font></div>`;

  if (finalHtml.match(/<body[^>]*>/i)) {
    finalHtml = finalHtml.replace(/(<body[^>]*>)/i, `$1\n${subAssuntoDiv}`);
  } else {
    finalHtml = subAssuntoDiv + "\n" + finalHtml;
  }

  document.getElementById("updatedHTML").value = finalHtml;

  // Atualiza o preview e mostra o modal
  const frame = document.getElementById("previewFrame");
  if (frame) {
    const modal = document.getElementById("previewModal");
    modal.style.display = "flex";

    // Centraliza novamente o modal apenas se ele não tiver sido movido (opcional)
    // Se quiser manter a posição onde o usuário deixou, não mexa no top/left aqui.
    // Se quiser resetar a posição toda vez que abre, descomente as linhas abaixo:
    // modal.style.top = "50%";
    // modal.style.left = "50%";
    // modal.style.transform = "translate(-50%, -50%)";

    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write(finalHtml);
    doc.close();
  }

  // Salva o resultado final também
  saveToLocalStorage();
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

function resetAll() {
  if (confirm("Tem certeza que deseja apagar todas as informações e começar do zero?")) {
    localStorage.removeItem("automatizarHtmlData");

    document.getElementById("htmlInput").value = "";
    document.getElementById("emailSubject").value = "";
    document.getElementById("emailPreheader").value = "";

    document.getElementById("replaceHeader").checked = false;
    document.getElementById("noHeader").checked = false;
    document.getElementById("replaceFooter").checked = false;
    document.getElementById("noFooter").checked = false;
    document.getElementById("mailbizCheck").checked = false;

    document.getElementById("fieldsContainer").innerHTML = "";
    document.getElementById("updatedHTML").value = "";

    location.reload();
  }
}

function closeModal() {
  document.getElementById("previewModal").style.display = "none";
}

function initModalDrag() {
  const modal = document.getElementById("previewModal");
  const header = document.getElementById("modalHeader");

  if (!modal || !header) return;

  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  header.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = modal.getBoundingClientRect();

    // Remove o transform para usar top/left absolutos
    modal.style.transform = "none";
    modal.style.left = rect.left + "px";
    modal.style.top = rect.top + "px";

    initialLeft = rect.left;
    initialTop = rect.top;
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    modal.style.left = (initialLeft + dx) + "px";
    modal.style.top = (initialTop + dy) + "px";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
}