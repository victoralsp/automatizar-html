 function autoFormat() {
      const rawHTML = document.getElementById("htmlInput").value;
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
      const count = parseInt(document.getElementById("linkCount").value);
      const container = document.getElementById("fieldsContainer");
      container.innerHTML = "";
      for (let i = 0; i < count; i++) {
        container.innerHTML += `
          <div class="row">
            <input type="text" placeholder="Link ${i + 1}" class="link">
            <input type="text" placeholder="Alt/Title ${i + 1}" class="altTitle">
          </div>`;
      }
    }

    function updateHTML() {
      let html = document.getElementById("htmlInput").value;
      const links = document.querySelectorAll(".link");
      const altTitles = document.querySelectorAll(".altTitle");

      let index = 0;
      html = html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, function(match) {
        const href = links[index]?.value || "#";
        const altTitle = altTitles[index]?.value || "";
        const updated = match
          .replace(/href="[^"]*"/, `href="${href}"`)
          .replace(/title="[^"]*"/, '')
          .replace(/<a/, `<a title="${altTitle}"`)
          .replace(/<img\b[^>]*>/, img => {
            if (img.includes('alt=')) {
              return img.replace(/alt="[^"]*"/, `alt="${altTitle}"`);
            } else {
              return img.replace(/<img/, `<img alt="${altTitle}"`);
            }
          });
        index++;
        return updated;
      });

      document.getElementById("updatedHTML").value = html;
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