import { db, storage } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  getDocs,
  collection,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  listAll
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ===== GET PRODUCT ID =====
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

if (!id) {
  alert("Product ID missing");
}

// ===== INPUTS =====
const nameInput = document.getElementById("name");
const descInput = document.getElementById("desc");
const priceInput = document.getElementById("price");
const catSelect = document.getElementById("category");
const salePriceInput = document.getElementById("salePrice");
const stockStatus = document.getElementById("stockStatus");

const preview = document.getElementById("imagePreview");
const newImagesInput = document.getElementById("newImages");

const allowOnline = document.getElementById("allowOnline");
const allowCOD = document.getElementById("allowCOD");
const allowAdvance = document.getElementById("allowAdvance");

const onlineDiscountType = document.getElementById("onlineDiscountType");
const onlineDiscountValue = document.getElementById("onlineDiscountValue");

const codDiscountType = document.getElementById("codDiscountType");
const codDiscountValue = document.getElementById("codDiscountValue");

const advanceDiscountType = document.getElementById("advanceDiscountType");
const advanceDiscountValue = document.getElementById("advanceDiscountValue");

const advanceType = document.getElementById("advanceType");
const advanceValue = document.getElementById("advanceValue");

const bestsellerCheckbox = document.getElementById("isBestseller");

// ===== STATE =====
let existingImages = [];
let newImages = [];

let colors = [];
let sizes = [];
let customOptions = [];
let relatedDesigns = [];
let allProducts = [];

let selectedTags = [];
let gallerySelected = [];
const galleryBreadcrumbs = document.getElementById("galleryBreadcrumbs");

// ===== POPUP =====
function showPopup(msg) {
  const p = document.getElementById("popup");
  p.innerText = msg;
  p.classList.remove("hidden");
}

function hidePopup() {
  document.getElementById("popup").classList.add("hidden");
}

// ===== ACCORDION =====
window.toggleSection = (id) => {
  document.getElementById(id).classList.toggle("hidden");
};

// ===== LOAD CATEGORIES =====
async function loadCategories(){

  catSelect.innerHTML = `<option value="">Select category</option>`;

  const snap = await getDocs(
    query(collection(db,"categories"),orderBy("order"))
  );

  const categories = [];

  snap.forEach(doc=>{
    categories.push({
      id: doc.id,
      ...doc.data()
    });
  });

  const mains = categories.filter(c => !c.parentId);

  mains.forEach(main=>{

    // main category
    const opt = document.createElement("option");
    opt.value = main.id;
    opt.textContent = main.name;
    opt.dataset.type = "main";

    catSelect.appendChild(opt);

    // sub categories
    const subs = categories.filter(c => c.parentId === main.id);

    subs.forEach(sub=>{

      const subOpt = document.createElement("option");

      subOpt.value = sub.id;
      subOpt.textContent = "— " + sub.name;
      subOpt.dataset.type = "sub";
      subOpt.dataset.parent = main.id;

      catSelect.appendChild(subOpt);

    });

  });

}

// ===== LOAD PRODUCT =====
async function loadProduct() {
  const snap = await getDoc(doc(db, "products", id));
  if (!snap.exists()) {
    alert("Product not found");
    return;
  }

  const p = snap.data();

  nameInput.value = p.name || "";
  descInput.value = p.description || "";
  priceInput.value = p.basePrice || "";
  salePriceInput.value = p.salePrice || "";
if (stockStatus) {
  stockStatus.value = (p.inStock === false) ? "false" : "true";
}
  catSelect.value = p.subCategoryId || p.categoryId || "";
  existingImages = p.images || [];

  colors = p.variants?.colors || [];
  sizes = p.variants?.sizes || [];
  customOptions = p.customOptions || [];
  relatedDesigns = p.relatedDesigns || [];

  selectedTags = p.tags || [];

  if (bestsellerCheckbox) {
    bestsellerCheckbox.checked = p.isBestseller || false;
  }

  const ps = p.paymentSettings || {};

  if (ps.online) {
    allowOnline.checked = ps.online.enabled ?? true;
    onlineDiscountType.value = ps.online.discountType || "none";
    onlineDiscountValue.value = ps.online.discountValue || "";
  }

  if (ps.cod) {
    allowCOD.checked = ps.cod.enabled ?? false;
    codDiscountType.value = ps.cod.discountType || "none";
    codDiscountValue.value = ps.cod.discountValue || "";
  }

  if (ps.advance) {
    allowAdvance.checked = ps.advance.enabled ?? false;
    advanceDiscountType.value = ps.advance.discountType || "none";
    advanceDiscountValue.value = ps.advance.discountValue || "";
    advanceType.value = ps.advance.type || "percent";
    advanceValue.value = ps.advance.value || "";
  }

  renderImagePreview();
  renderColors();
  renderSizes();
  renderCustomOptions();
  loadDesignProducts();
  loadTags();
}

// ===== IMAGE PREVIEW =====
function renderImagePreview() {
  preview.innerHTML = "";

  existingImages.forEach((url, index) => {
    const div = document.createElement("div");
    div.className = "image-card";

    const img = document.createElement("img");
    img.src = url;

    const del = document.createElement("span");
    del.innerText = "×";
    del.onclick = () => {
      existingImages.splice(index, 1);
      renderImagePreview();
    };

    div.appendChild(img);
    div.appendChild(del);
    preview.appendChild(div);
  });

  newImages.forEach((file, index) => {
    const div = document.createElement("div");
    div.className = "image-card";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);

    const del = document.createElement("span");
    del.innerText = "×";
    del.onclick = () => {
      newImages.splice(index, 1);
      renderImagePreview();
    };

    div.appendChild(img);
    div.appendChild(del);
    preview.appendChild(div);
  });
}

newImagesInput.addEventListener("change", () => {
  const files = Array.from(newImagesInput.files);
  files.forEach(file => newImages.push(file));
  renderImagePreview();
});
// ========== COLORS ==========
window.addEditColor = () => {

  const name = document.getElementById("editColorName").value.trim();
  const price = Number(document.getElementById("editColorPrice").value || 0);
  const required = document.getElementById("colorRequired")?.checked || false;

  if (!name) return;

  colors.push({
    name,
    price,
    required
  });

  renderColors();

  document.getElementById("editColorName").value = "";
  document.getElementById("editColorPrice").value = "";
  document.getElementById("colorRequired").checked = false;
};

function renderColors() {
  const list = document.getElementById("editColorList");
  list.innerHTML = "";
  colors.forEach((c, i) => {
    const div = document.createElement("div");
   div.innerText = `${c.name} (+₹${c.price}) ${c.required ? "(Required)" : ""} ❌`;
    div.onclick = () => {
      colors.splice(i, 1);
      renderColors();
    };
    list.appendChild(div);
  });
}

// ========== SIZES ==========
window.addEditSize = () => {

  const name = document.getElementById("editSizeName").value.trim();
  const price = Number(document.getElementById("editSizePrice").value || 0);
  const required = document.getElementById("sizeRequired")?.checked || false;

  if (!name) return;

  sizes.push({
    name,
    price,
    required
  });

  renderSizes();

  document.getElementById("editSizeName").value = "";
  document.getElementById("editSizePrice").value = "";
  document.getElementById("sizeRequired").checked = false;
};

function renderSizes() {
  const list = document.getElementById("editSizeList");
  list.innerHTML = "";
  sizes.forEach((s, i) => {
    const div = document.createElement("div");
    div.innerText = `${s.name} (+₹${s.price}) ${s.required ? "(Required)" : ""} ❌`;
    div.onclick = () => {
      sizes.splice(i, 1);
      renderSizes();
    };
    list.appendChild(div);
  });
}

// ========== CUSTOM OPTIONS ==========
window.addEditCustomOption = () => {

  const type = document.getElementById("editCustomType").value;
  const label = document.getElementById("editCustomLabel").value.trim();
  const price = Number(document.getElementById("editCustomPrice").value || 0);
  const choicesRaw = document.getElementById("editCustomChoices").value;
  const required = document.getElementById("customRequired")?.checked || false;

  if (!label) return;

  const option = {
    type,
    label,
    price,
    required
  };

  if (type === "dropdown") {
    option.choices = choicesRaw
      .split(",")
      .map(v => v.trim())
      .filter(Boolean);
  }

  customOptions.push(option);

  renderCustomOptions();

  document.getElementById("editCustomLabel").value = "";
  document.getElementById("editCustomPrice").value = "";
  document.getElementById("editCustomChoices").value = "";
  document.getElementById("customRequired").checked = false;
};

function renderCustomOptions() {
  const list = document.getElementById("editCustomList");
  list.innerHTML = "";
  customOptions.forEach((o, i) => {
    const div = document.createElement("div");
    div.innerText = `${o.type}: ${o.label} (+₹${o.price}) ${o.required ? "(Required)" : ""} ❌`;
    div.onclick = () => {
      customOptions.splice(i, 1);
      renderCustomOptions();
    };
    list.appendChild(div);
  });
}

// ========== RELATED DESIGNS ==========
async function loadDesignProducts() {
  const snap = await getDocs(collection(db, "products"));
  allProducts = [];

  snap.forEach(d => {
    allProducts.push({ id: d.id, ...d.data() });
  });

  renderDesignList(allProducts);
}

function renderDesignList(list) {
  const box = document.getElementById("designList");
  if (!box) return;

  box.innerHTML = "";

  list.forEach(p => {
    if (p.id === id) return;

    const row = document.createElement("div");
    row.className = "design-item";

    const checked = relatedDesigns.includes(p.id);

    row.innerHTML = `
      <input type="checkbox" ${checked ? "checked" : ""} onchange="toggleDesign('${p.id}')">
      <img src="${p.images?.[0] || ''}">
      <span>${p.name}</span>
    `;

    box.appendChild(row);
  });
}

window.toggleDesign = function(pid) {
  if (relatedDesigns.includes(pid)) {
    relatedDesigns = relatedDesigns.filter(x => x !== pid);
  } else {
    relatedDesigns.push(pid);
  }
};

window.filterDesigns = function() {
  const q = document.getElementById("designSearch").value.toLowerCase();
  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(q)
  );
  renderDesignList(filtered);
};

// ========== TAGS ==========
async function loadTags() {
  const box = document.getElementById("tagCheckboxes");
  if (!box) return;

  const snap = await getDocs(collection(db, "tags"));
  box.innerHTML = "";

  snap.forEach(d => {
    const t = d.data();

    const row = document.createElement("div");
    row.className = "tag-item";

    const checked = selectedTags.includes(t.slug);

    row.innerHTML = `
      <input type="checkbox" ${checked ? "checked" : ""}>
      <span>${t.name}</span>
    `;

    const checkbox = row.querySelector("input");

    checkbox.addEventListener("change", () => {
      toggleTag(t.slug, checkbox.checked);
    });

    box.appendChild(row);
  });
}

window.toggleTag = function(slug, checked) {
  if (checked) {
    if (!selectedTags.includes(slug)) selectedTags.push(slug);
  } else {
    selectedTags = selectedTags.filter(t => t !== slug);
  }
};


// ========== STORAGE GALLERY PICKER ==========

let currentGalleryPath = "product-images";

window.openGalleryPicker = function () {

  document.getElementById("galleryPicker").classList.remove("hidden");

  loadGalleryFolder("product-images");

};

async function loadGalleryFolder(path){

  currentGalleryPath = path;
updateGalleryBreadcrumbs(path);

  const grid = document.getElementById("galleryPickerGrid");

  grid.innerHTML = "";

  const folderRef = ref(storage, path);

  const res = await listAll(folderRef);





function updateGalleryBreadcrumbs(path){

  if(!galleryBreadcrumbs) return;

  galleryBreadcrumbs.innerHTML = "";

  const parts = path.replace("product-images","").split("/").filter(Boolean);

  // HOME
  const home = document.createElement("span");
  home.innerText = "Home";
  home.style.cursor = "pointer";
  home.onclick = () => loadGalleryFolder("product-images");

  galleryBreadcrumbs.appendChild(home);

  // BUILD PATH STEP BY STEP
  let currentPath = "product-images";

  parts.forEach((part,index)=>{

    currentPath += "/" + part;

    const span = document.createElement("span");
    span.innerText = " / " + decodeURIComponent(part);
    span.style.cursor = "pointer";

    const pathCopy = currentPath;   // important fix

    span.onclick = () => {
      loadGalleryFolder(pathCopy);
    };

    galleryBreadcrumbs.appendChild(span);

  });

}

  /* ===== SHOW FOLDERS ===== */

  res.prefixes.forEach(folder => {

    const div = document.createElement("div");
    div.className = "gallery-folder";

    div.innerHTML = `
      <div class="folder-icon">📁</div>
      <span>${folder.name}</span>
    `;

    div.onclick = () => {
      loadGalleryFolder(folder.fullPath);
    };

    grid.appendChild(div);

  });


  /* ===== SHOW IMAGES ===== */

  for(const file of res.items){

    const url = await getDownloadURL(file);

    const div = document.createElement("div");
    div.className = "gallery-img";

    div.innerHTML = `
      <input type="checkbox" class="gallery-check">
      <img src="${url}">
    `;

    const checkbox = div.querySelector("input");

    checkbox.onchange = () => {

      if(checkbox.checked){
        gallerySelected.push(url);
      }else{
        gallerySelected = gallerySelected.filter(x => x !== url);
      }

    };

    grid.appendChild(div);

  }

}

window.closeGalleryPicker = function () {

  document.getElementById("galleryPicker").classList.add("hidden");

};

window.addSelectedImages = function () {

  gallerySelected.forEach(url => {
    existingImages.push(url);
  });

  gallerySelected = [];

  renderImagePreview();

  closeGalleryPicker();

};


// ========== UPDATE PRODUCT ==========
window.updateProduct = async () => {
  const name = nameInput.value.trim();
  const price = priceInput.value;
  const selectedOption = catSelect.options[catSelect.selectedIndex];

let categoryId = null;
let subCategoryId = null;

if (selectedOption.dataset.type === "main") {
  categoryId = selectedOption.value;
}

if (selectedOption.dataset.type === "sub") {
  subCategoryId = selectedOption.value;
  categoryId = selectedOption.dataset.parent;
}
  const isBestseller = document.getElementById("isBestseller")?.checked || false;

  if (!name || !price || !selectedOption.value) {
    showPopup("⚠ Fill all required fields");
    setTimeout(hidePopup, 1500);
    return;
  }

  try {
    showPopup("Uploading images...");

    const finalImages = [...existingImages];

    for (let file of newImages) {
      const r = ref(storage, `products/${Date.now()}-${file.name}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      finalImages.push(url);
    }

    showPopup("Saving changes...");

    const paymentSettings = {
      online: {
        enabled: allowOnline.checked,
        discountType: onlineDiscountType.value,
        discountValue: Number(onlineDiscountValue.value || 0)
      },
      cod: {
        enabled: allowCOD.checked,
        discountType: codDiscountType.value,
        discountValue: Number(codDiscountValue.value || 0)
      },
      advance: {
        enabled: allowAdvance.checked,
        discountType: advanceDiscountType.value,
        discountValue: Number(advanceDiscountValue.value || 0),
        type: advanceType.value,
        value: Number(advanceValue.value || 0)
      }
    };

    await updateDoc(doc(db, "products", id), {
      name,
      description: descInput.value,
      basePrice: Number(price),
salePrice: Number(salePriceInput.value || price),
inStock: stockStatus?.value === "true",
      categoryId,
subCategoryId,
      images: finalImages,
      variants: {
        colors,
        sizes
      },
      customOptions,
      paymentSettings,
      relatedDesigns,
      tags: selectedTags,
      isBestseller: isBestseller
    });

    // ========== BIDIRECTIONAL LINKING ==========
    for (const rid of relatedDesigns) {
      const refDoc = doc(db, "products", rid);
      const snap = await getDoc(refDoc);

      if (snap.exists()) {
        const data = snap.data();
        const arr = data.relatedDesigns || [];

        if (!arr.includes(id)) {
          arr.push(id);
          await updateDoc(refDoc, { relatedDesigns: arr });
        }
      }
    }

    showPopup("✅ Product updated");

    setTimeout(() => {
      hidePopup();
      location.href = "products.html";
    }, 1200);

  } catch (e) {
    console.error(e);
    showPopup("❌ " + e.message);
  }
};

// ========== INIT ==========
// ========== INIT ==========
loadCategories().then(() => {
  loadProduct().then(() => {
    loadDesignProducts();
    if (typeof loadTags === "function") {
      loadTags();
    }
  });
});