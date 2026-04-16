import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const fileInput = document.getElementById("excelUpload");

/* ================= CATEGORY HELPER ================= */

async function getOrCreateCategory(name, parentId = null) {

  const snap = await getDocs(collection(db, "categories"));

  let found = null;

  snap.forEach(doc => {
    const c = doc.data();

    if (
      c.name?.toLowerCase() === name.toLowerCase() &&
      (c.parentId || null) === parentId
    ) {
      found = { id: doc.id, ...c };
    }
  });

  if (found) return found.id;

  // create new category
  const newCat = await addDoc(collection(db, "categories"), {
    name,
    parentId,
    order: Date.now()
  });

  return newCat.id;
}

/* ================= DOWNLOAD TEMPLATE ================= */

window.downloadTemplate = () => {

  const data = [
    {
      name: "",
      description: "",
      basePrice: "",
      salePrice: "",
      category: "",
      subCategory: "",
      images: "",
      tags: "",
      colors: "",
      sizes: "",
      customOptions: "",
      bestseller: "false"
    }
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "products");

  XLSX.writeFile(wb, "product-template.xlsx");
};

/* ================= EXPORT PRODUCTS ================= */

window.exportProducts = async () => {

  const snap = await getDocs(collection(db, "products"));
  const catSnap = await getDocs(collection(db, "categories"));

  const categoryMap = {};

  catSnap.forEach(d => {
    categoryMap[d.id] = d.data();
  });

  const rows = [];

  snap.forEach(doc => {

    const p = doc.data();

    rows.push({

      name: p.name,
      description: p.description,

      basePrice: p.basePrice,
      salePrice: p.salePrice || "",

      category: categoryMap[p.categoryId]?.name || "",
      subCategory: categoryMap[p.subCategoryId]?.name || "",

      images: (p.images || []).join(","),
      tags: (p.tags || []).join(","),

      colors: (p.variants?.colors || [])
        .map(c => `${c.name}|${c.price}|${c.required}`)
        .join(";"),

      sizes: (p.variants?.sizes || [])
        .map(s => `${s.name}|${s.price}|${s.required}`)
        .join(";"),

      customOptions: (p.customOptions || [])
        .map(o => `${o.type}|${o.label}|${o.price}|${o.required}`)
        .join(";"),

      bestseller: p.isBestseller || false

    });

  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "products");

  XLSX.writeFile(wb, "products-export.xlsx");
};

/* ================= IMPORT EXCEL ================= */

fileInput.addEventListener("change", async (e) => {

  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async (evt) => {

    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    for (const r of rows) {

      /* ===== CATEGORY ===== */

      let categoryId = null;
      let subCategoryId = null;

      if (r.category) {
        categoryId = await getOrCreateCategory(r.category);
      }

      if (r.subCategory && categoryId) {
        subCategoryId = await getOrCreateCategory(r.subCategory, categoryId);
      }

      /* ===== IMAGES ===== */

      const images = r.images ? r.images.split(",") : [];

      /* ===== TAGS ===== */

      const tags = r.tags ? r.tags.split(",") : [];

      /* ===== COLORS ===== */

      const colors = r.colors
        ? r.colors.split(";").map(c => {
            const [name, price, required] = c.split("|");
            return {
              name,
              price: Number(price),
              required: required === "true"
            };
          })
        : [];

      /* ===== SIZES ===== */

      const sizes = r.sizes
        ? r.sizes.split(";").map(s => {
            const [name, price, required] = s.split("|");
            return {
              name,
              price: Number(price),
              required: required === "true"
            };
          })
        : [];

      /* ===== CUSTOM OPTIONS ===== */

      const customOptions = r.customOptions
        ? r.customOptions.split(";").map(o => {
            const [type, label, price, required] = o.split("|");
            return {
              type,
              label,
              price: Number(price),
              required: required === "true"
            };
          })
        : [];

      /* ===== SAVE PRODUCT ===== */

      await addDoc(collection(db, "products"), {

        name: r.name,
        description: r.description,

        basePrice: Number(r.basePrice),
        salePrice: Number(r.salePrice || r.basePrice),

        categoryId,
        subCategoryId,

        images,
        tags,

        variants: {
          colors,
          sizes
        },

        customOptions,

        isBestseller: r.bestseller === "true",

        createdAt: Date.now()

      });

    }

    alert("✅ Products Imported Successfully");

  };

  reader.readAsArrayBuffer(file);

});