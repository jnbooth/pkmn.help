import fs from "fs";
import { JSDOM } from "jsdom";
import fetch from "node-fetch";
import path from "path";
import { URL } from "url";

const mainURL =
  "https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_by_National_Pok%C3%A9dex_number";

const CODE_POINT_A = "a".codePointAt(0)!;

function chr(n: number): string {
  return String.fromCodePoint(CODE_POINT_A + n);
}

function text(elem: HTMLElement): string {
  return (elem.textContent || "").trim();
}

interface Download {
  image: string;
  id: string;
}

interface Monster {
  id: string;
  name: string;
  number: number;
  types: string[];
  pageURL: string;
  hitPoints: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

async function documentForURL(url: string): Promise<Document> {
  const html = await fetch(url).then((r) => r.text());
  return new JSDOM(html).window.document;
}

async function fetchData(): Promise<{
  monsters: Monster[];
  downloads: Download[];
}> {
  const document = await documentForURL(mainURL);
  const downloads: Download[] = [];
  const monsters: Monster[] = [];
  const map = new Map();
  for (const table of document.querySelectorAll("table")) {
    const firstHeader = table.querySelector("th");
    if (firstHeader && text(firstHeader).endsWith("dex")) {
      for (const row of table.querySelectorAll("tr")) {
        const elements = [...row.querySelectorAll("td")];
        const data = elements.map((d) => text(d));
        if (data.length <= 0) {
          continue;
        }
        const relativeURL = elements[2].querySelector("a")?.href ?? "";
        const pageURL = relativeURL
          ? new URL(relativeURL, mainURL).toString()
          : "";
        const name = data[2];
        const number = Number(data[1].slice(1));
        const count = map.get(number) || 0;
        map.set(number, count + 1);
        const suffix = count > 0 ? chr(count) : "";
        const id = `pkmn-${number}${suffix}`;
        const type1 = data[3].toLowerCase();
        const type2 = data[4]?.toLowerCase();
        const types = [type1];
        if (type2) {
          types.push(type2);
        }
        const image = elements[2]
          ?.querySelector("img")
          ?.src.replace(/^[/]{2}/, "https://");
        if (number) {
          monsters.push({
            id,
            name,
            number,
            types,
            pageURL: pageURL,
            hitPoints: 0,
            attack: 0,
            defense: 0,
            specialAttack: 0,
            specialDefense: 0,
            speed: 0,
          });
          if (image) {
            downloads.push({ image, id });
          }
        }
      }
    }
  }
  return { monsters, downloads };
}

async function getStats(url: string, monster: Monster) {
  const document = await documentForURL(url);
  const heading = document.querySelector("#Base_stats");
  const table = heading?.parentElement?.nextElementSibling;
  if (!table) {
    console.error("Couldn't find stats for", monster.id, monster.name);
    return;
  }
  for (const th of table.querySelectorAll("th")) {
    const t = text(th);
    const [first, second] = t.split(":");
    const value = Number(second);
    switch (first) {
      case "HP":
        monster.hitPoints = value;
        break;
      case "Attack":
        monster.attack = value;
        break;
      case "Defense":
        monster.defense = value;
        break;
      case "Sp. Atk":
        monster.specialAttack = value;
        break;
      case "Sp. Def":
        monster.specialDefense = value;
        break;
      case "Speed":
        monster.speed = value;
        break;
    }
  }
}

async function main(): Promise<void> {
  const { monsters, downloads } = await fetchData();
  for (const mon of monsters) {
    console.log(`Fetching stats for ${mon.id} (${mon.name})`);
    await getStats(mon.pageURL, mon);
  }
  fs.writeFileSync(
    path.resolve(__dirname, "../src/data-pkmn.json"),
    JSON.stringify(monsters, null, 2),
    "utf-8"
  );
  for (const dl of downloads) {
    const filename = path.resolve(__dirname, `../img/${dl.id}.png`);
    if (!fs.existsSync(filename)) {
      console.log(`Downloading ${dl.image} to ${filename}`);
      const buffer = await fetch(dl.image).then((r) => r.buffer());
      fs.writeFileSync(filename, buffer);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
