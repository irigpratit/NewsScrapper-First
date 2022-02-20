const cheerio = require("cheerio");
const axios = require("axios");
const stopWords = require("./stop");
const ObjectsToCsv = require("objects-to-csv");

async function getHtml(url) {
  const response = await axios.get(url);
  return response.data;
}

async function getAllLinksFromHtml(html) {
  const $ = cheerio.load(html);
  const links = [];
  $("a").each((i, link) => {
    links.push($(link).attr("href"));
  });
  return links;
}

async function getInnerTextFromHtml(html) {
  const $ = cheerio.load(html);
  const text = $("body").text();
  return text;
}

(async () => {
  const url = "https://ekantipur.com/business";
  const html = await getHtml(url);
  const links = await getAllLinksFromHtml(html);

  const filteredLinks = links
    .filter((link) => link?.includes("/202"))
    .map((el) => (el?.includes("http") ? el : `https://ekantipur.com${el}`));
  const removeDuplicate = [...new Set(filteredLinks)];

  console.log(removeDuplicate);

  let text = "";

  const _rD = removeDuplicate.map(async (el, index) => {
    const _h = await getHtml(el);
    console.log(index);
    return await getInnerTextFromHtml(_h);
  });

  const texts = await Promise.all(_rD);
  text = texts.join(" ");

  let obj = {};
  text.split(" ").forEach((el) => {
    el = el.trim();
    el = el.replace(/\t/g, "");
    el = el.replace(/\n/g, "");
    if (el.length > 0 && !stopWords.includes(el)) {
      obj[el] = obj[el] ? obj[el] + 1 : 1;
    }
  });

  const sortable = Object.entries(obj)
    .sort(([, a], [, b]) => a - b)
    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

  let data = [];
  for (const [key, value] of Object.entries(sortable)) {
    data.push({
      word: key,
      count: value,
    });
  }

  const csv = new ObjectsToCsv(data.reverse());
  await csv.toDisk("./ek.csv");

  console.log(sortable);
})();
