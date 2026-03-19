const ALMOCO_MINUTOS = 60;
let grafico = null;

normalizarDados();

document.getElementById("registrar").addEventListener("click", calcular);

function calcular() {
  const usuario = document.getElementById("usuario").value.trim();
  const data = document.getElementById("data").value;
  const entrada = document.getElementById("entrada").value;
  const saida = document.getElementById("saida").value;
  const carga = parseFloat(document.getElementById("cargaHoraria").value);
  const negativas = parseFloat(document.getElementById("horasNegativas").value) || 0;

  if (!usuario || !data || !entrada || !saida) {
    alert("Preencha todos os campos.");
    return;
  }

  const dados = getDados();

  const jaExiste = dados.find(d => d.usuario === usuario && d.data === data);
  if (jaExiste) {
    alert("Já existe registro para este dia.");
    return;
  }

  const minutos = calcularMinutos(entrada, saida) - ALMOCO_MINUTOS;
  const minutosLiquidos = minutos < 0 ? 0 : minutos;

  const horasLiquidas = minutosLiquidos / 60;
  const saldoDia = horasLiquidas - carga;

  const registro = {
    usuario,
    data,
    entrada,
    saida,
    horasLiquidas: horasLiquidas.toFixed(2),
    saldoDia: saldoDia.toFixed(2)
  };

  dados.push(registro);
  salvarDados(dados);

  atualizar(usuario, negativas);
  atualizarResultado(registro, negativas);
}

function calcularMinutos(e, s) {
  const [h1, m1] = e.split(":").map(Number);
  const [h2, m2] = s.split(":").map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

function getDados() {
  return JSON.parse(localStorage.getItem("bancoHoras")) || [];
}

function salvarDados(dados) {
  localStorage.setItem("bancoHoras", JSON.stringify(dados));
}

function normalizarDados() {
  const dados = getDados();

  const novos = dados.map(d => {
    let data = d.data;

    if (data.includes("/")) {
      const [dia, mes, ano] = data.split("/");
      data = `${ano}-${mes}-${dia}`;
    }

    return {
      usuario: d.usuario,
      data,
      entrada: d.entrada,
      saida: d.saida,
      horasLiquidas: parseFloat(d.horasLiquidas || 0).toFixed(2),
      saldoDia: parseFloat(d.saldoDia || 0).toFixed(2)
    };
  });

  salvarDados(novos);
}

function atualizar(usuario, negativas) {
  const dados = getDados();

  const filtrado = dados
    .filter(d => d.usuario === usuario)
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  if (!filtrado.length) return;

  const ultimo = filtrado[filtrado.length - 1];

  document.getElementById("cardHoras").innerText = ultimo.horasLiquidas + "h";
  document.getElementById("cardSaldoDia").innerText = ultimo.saldoDia + "h";

  const total = filtrado.reduce((acc, d) => acc + parseFloat(d.saldoDia), 0);
  const saldoFinal = total - negativas;

  document.getElementById("cardSaldoTotal").innerText = saldoFinal.toFixed(2) + "h";

  atualizarAviso(saldoFinal);
  atualizarHistorico(filtrado);
  atualizarGrafico(filtrado);
  atualizarMetricas(filtrado);
}

function atualizarResultado(r, negativas) {
  const saldoFinal = parseFloat(r.saldoDia) - negativas;

  document.getElementById("resultado").innerHTML = `
    <p>Horas trabalhadas: <strong>${r.horasLiquidas}h</strong></p>
    <p>Saldo do dia: <strong>${r.saldoDia}h</strong></p>
    <p>Saldo final: <strong>${saldoFinal.toFixed(2)}h</strong></p>
  `;
}

function atualizarHistorico(dados) {
  let html = `
    <table>
      <tr>
        <th>Data</th>
        <th>Entrada</th>
        <th>Saída</th>
        <th>Horas</th>
        <th>Saldo</th>
      </tr>
  `;

  dados.forEach(d => {
    const saldo = parseFloat(d.saldoDia);
    const cor = saldo >= 0 ? "var(--positive)" : "var(--negative)";

    html += `
      <tr>
        <td>${formatarData(d.data)}</td>
        <td>${d.entrada}</td>
        <td>${d.saida}</td>
        <td>${d.horasLiquidas}h</td>
        <td style="color:${cor}">${saldo.toFixed(2)}h</td>
      </tr>
    `;
  });

  html += "</table>";
  document.getElementById("listaHistorico").innerHTML = html;
}

function atualizarGrafico(dados) {
  const labels = dados.map(d => formatarData(d.data));
  const valores = dados.map(d => parseFloat(d.saldoDia));

  if (grafico) grafico.destroy();

  grafico = new Chart(document.getElementById("graficoHoras"), {
    type: "line",
    data: {
      labels,
      datasets: [{ label: "Saldo diário", data: valores }]
    }
  });
}

function atualizarMetricas(dados) {
  if (!dados.length) return;

  const totalHoras = dados.reduce((acc, d) => acc + parseFloat(d.horasLiquidas), 0);
  const media = totalHoras / dados.length;

  const positivos = dados.filter(d => parseFloat(d.saldoDia) > 0).length;
  const negativos = dados.filter(d => parseFloat(d.saldoDia) < 0).length;

  document.getElementById("mediaHoras").innerText = media.toFixed(2) + "h";
  document.getElementById("totalHoras").innerText = totalHoras.toFixed(2) + "h";
  document.getElementById("diasPositivos").innerText = positivos;
  document.getElementById("diasNegativos").innerText = negativos;
}

function atualizarAviso(saldo) {
  const el = document.getElementById("aviso");

  if (saldo < 0) {
    el.innerHTML = `Faltam ${Math.abs(saldo).toFixed(2)}h para zerar`;
    el.style.color = "var(--negative)";
  } else {
    el.innerHTML = `Saldo positivo de ${saldo.toFixed(2)}h`;
    el.style.color = "var(--positive)";
  }
}

function formatarData(data) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function filtrarPorMes(dados, mes) {
  if (!mes) return dados;
  return dados.filter(d => d.data.startsWith(mes));
}

function exportarExcel() {
  const usuario = document.getElementById("usuario").value.trim();
  const mes = document.getElementById("data").value.slice(0, 7);

  const dados = filtrarPorMes(getDados(), mes)
    .filter(d => d.usuario === usuario);

  if (!dados.length) {
    alert("Sem dados.");
    return;
  }

  const total = dados.reduce((acc, d) => acc + parseFloat(d.saldoDia), 0);

  let tabela = `
    <table>
      <tr><th>Data</th><th>Entrada</th><th>Saída</th><th>Horas</th><th>Saldo</th></tr>
  `;

  dados.forEach(d => {
    tabela += `
      <tr>
        <td>${formatarData(d.data)}</td>
        <td>${d.entrada}</td>
        <td>${d.saida}</td>
        <td>${d.horasLiquidas}</td>
        <td>${d.saldoDia}</td>
      </tr>
    `;
  });

  tabela += `<tr><td colspan="4"><strong>Total</strong></td><td>${total.toFixed(2)}</td></tr></table>`;

  const blob = new Blob([tabela], { type: "application/vnd.ms-excel" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `relatorio_${usuario}.xls`;
  link.click();
}

function exportarPDF() {
  const usuario = document.getElementById("usuario").value.trim();
  const mes = document.getElementById("data").value.slice(0, 7);

  const dados = filtrarPorMes(getDados(), mes)
    .filter(d => d.usuario === usuario);

  if (!dados.length) {
    alert("Sem dados.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 10;
  doc.text(`Relatório - ${usuario}`, 10, y);
  y += 10;

  dados.forEach(d => {
    doc.text(
      `${formatarData(d.data)} | ${d.entrada}-${d.saida} | ${d.horasLiquidas}h | ${d.saldoDia}h`,
      10,
      y
    );
    y += 8;
  });

  const total = dados.reduce((acc, d) => acc + parseFloat(d.saldoDia), 0);
  y += 10;
  doc.text(`Saldo Total: ${total.toFixed(2)}h`, 10, y);

  doc.save(`relatorio_${usuario}.pdf`);
}