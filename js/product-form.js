import { db, storage } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  listAll
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Inputs
const nameInput = document.getElementById("name");
const descInput = document.getElementById("desc");
const priceInput = document.getElementById("price");
const catSelect = document.getElementById("category");
const imagesInput = document.getElementById("images");
const preview = document.getElementById("imagePreview");
const salePriceInput = document.getElementById("salePrice");
const stockStatus = document.getElementById("stockStatus");

// Tags & Bestseller
const tagBox = document.getElementById("tagCheckboxes");
const bestsellerCheckbox = document.getElementById("isBestseller");

// Payment & Discounts inputs
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

// State
let colors = [];
let sizes = [];
let customOptions = [];
let images = [];
let galleryImages = [];
let gallerySelected = [];
let currentGalleryPath = "product-images";
let galleryBreadcrumbs;
let relatedDesigns = [];
let allProducts = [];
let selectedTags = [];

// Accordion toggle
window.toggleSection = (id) => {
  document.getElementById(id).classList.toggle("hidden");
};

// Popup
function showPopup(msg) {
  const p = document.getElementById("popup");
  p.innerText = msg;
  p.classList.remove("hidden");
}

function hidePopup() {
  document.getElementById("popup").classList.add("hidden");
}

// Load categories
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
loadCategories();

// ========== IMAGE PICKER ==========
if (imagesInput) {
  imagesInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);

    files.forEach(file => images.push(file));
    renderImagePreview();
    imagesInput.value = "";
  });
}




function renderImagePreview() {

  preview.innerHTML = "";

  /* Uploaded images */

  images.forEach((file, index) => {

    const div = document.createElement("div");
    div.className = "image-card";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);

    const del = document.createElement("span");
    del.innerText = "×";

    del.onclick = () => {
      images.splice(index,1);
      renderImagePreview();
    };

    div.appendChild(img);
    div.appendChild(del);
    preview.appendChild(div);

  });

  /* Gallery images */

  galleryImages.forEach((url, index) => {

    const div = document.createElement("div");
    div.className = "image-card";

    const img = document.createElement("img");
    img.src = url;

    const del = document.createElement("span");
    del.innerText = "×";

    del.onclick = () => {
      galleryImages.splice(index,1);
      renderImagePreview();
    };

    div.appendChild(img);
    div.appendChild(del);
    preview.appendChild(div);

  });

}
// ========== COLORS ==========
window.addColor = () => {
  const name = document.getElementById("colorName").value.trim();
  const price = Number(document.getElementById("colorPrice").value || 0);
  const required = document.getElementById("colorRequired")?.checked || false;

  if (!name) return;

  colors.push({ name, price, required });
  renderColors();

  document.getElementById("colorName").value = "";
  document.getElementById("colorPrice").value = "";
  if (document.getElementById("colorRequired")) {
    document.getElementById("colorRequired").checked = false;
  }
};

function renderColors() {
  const list = document.getElementById("colorList");
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
window.addSize = () => {
  const name = document.getElementById("sizeName").value.trim();
  const price = Number(document.getElementById("sizePrice").value || 0);
  const required = document.getElementById("sizeRequired")?.checked || false;

  if (!name) return;

  sizes.push({ name, price, required });
  renderSizes();

  document.getElementById("sizeName").value = "";
  document.getElementById("sizePrice").value = "";
  if (document.getElementById("sizeRequired")) {
    document.getElementById("sizeRequired").checked = false;
  }
};

function renderSizes() {
  const list = document.getElementById("sizeList");
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
window.addCustomOption = () => {
  const type = document.getElementById("customType").value;
  const label = document.getElementById("customLabel").value.trim();
  const price = Number(document.getElementById("customPrice").value || 0);
  const choicesRaw = document.getElementById("customChoices").value;
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

  document.getElementById("customLabel").value = "";
  document.getElementById("customPrice").value = "";
  document.getElementById("customChoices").value = "";
  if (document.getElementById("customRequired")) {
    document.getElementById("customRequired").checked = false;
  }
};

function renderCustomOptions() {
  const list = document.getElementById("customList");
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

loadDesignProducts();

// ========== TAGS ==========
async function loadTags() {
  if (!tagBox) return;

  const snap = await getDocs(collection(db, "tags"));
  tagBox.innerHTML = "";

  snap.forEach(d => {
    const t = d.data();
    const row = document.createElement("div");
    row.className = "design-item";

    row.innerHTML = `
      <input type="checkbox" onchange="toggleTag('${t.slug}', this.checked)">
      <span>${t.name}</span>
    `;

    tagBox.appendChild(row);
  });
}

window.toggleTag = function(slug, checked) {
  if (checked) {
    if (!selectedTags.includes(slug)) selectedTags.push(slug);
  } else {
    selectedTags = selectedTags.filter(t => t !== slug);
  }
};

loadTags();


/* ========== STORAGE GALLERY PICKER ========== */

window.openGalleryPicker = function(){

  document.getElementById("galleryPicker").classList.remove("hidden");

setTimeout(()=>{
  loadGalleryFolder("product-images");
},10);

}

async function loadGalleryFolder(path){

  currentGalleryPath = path;

  updateGalleryBreadcrumbs(path);

  const grid = document.getElementById("galleryPickerGrid");

  grid.innerHTML = "";

  const folderRef = ref(storage,path);

  const res = await listAll(folderRef);


  /* folders */

  res.prefixes.forEach(folder=>{

    const div = document.createElement("div");
    div.className="gallery-folder";

    div.innerHTML=`
      <div class="folder-icon">📁</div>
      <span>${folder.name}</span>
    `;

    div.onclick=()=>loadGalleryFolder(folder.fullPath);

    grid.appendChild(div);

  });


  /* images */

  for(const file of res.items){

    const url = await getDownloadURL(file);

    const div=document.createElement("div");
    div.className="gallery-img";

    const checked = gallerySelected.includes(url) ? "checked" : "";

div.innerHTML = `
  <input type="checkbox" class="gallery-check" ${checked}>
  <img src="${url}">
`;

    const checkbox=div.querySelector("input");

    checkbox.onchange=()=>{

      if(checkbox.checked){

        gallerySelected.push(url);

      }else{

        gallerySelected=gallerySelected.filter(x=>x!==url);

      }

    };

    grid.appendChild(div);

  }

}


function updateGalleryBreadcrumbs(path){

  let galleryBreadcrumbs = document.getElementById("galleryBreadcrumbs");

  // if element missing create it
  if(!galleryBreadcrumbs){

    const picker = document.getElementById("galleryPicker");

    galleryBreadcrumbs = document.createElement("div");
    galleryBreadcrumbs.id = "galleryBreadcrumbs";
    galleryBreadcrumbs.className = "gallery-breadcrumbs";

    picker.insertBefore(
      galleryBreadcrumbs,
      document.getElementById("galleryPickerGrid")
    );

  }

  galleryBreadcrumbs.innerHTML="";

  const parts = path.replace("product-images","").split("/").filter(Boolean);

  const home = document.createElement("span");
  home.innerText="Home";
  home.style.cursor="pointer";
  home.onclick=()=>loadGalleryFolder("product-images");

  galleryBreadcrumbs.appendChild(home);

  let current="product-images";

  parts.forEach(part=>{

    current += "/" + part;

    const span = document.createElement("span");

    span.innerText=" / " + decodeURIComponent(part);
    span.style.cursor="pointer";

    const pathCopy=current;

    span.onclick=()=>loadGalleryFolder(pathCopy);

    galleryBreadcrumbs.appendChild(span);

  });

}

window.closeGalleryPicker = function(){

  const picker = document.getElementById("galleryPicker");

  if(picker){
    picker.classList.add("hidden");
  }

}

window.addSelectedImages = function () {

  if(!gallerySelected.length){
    alert("Select images first");
    return;
  }

  gallerySelected.forEach(url => {

    if(!galleryImages.includes(url)){
      galleryImages.push(url);
    }

  });

  gallerySelected = [];

  renderImagePreview();

  document.getElementById("galleryPicker").classList.add("hidden");

}

// ========== SAVE PRODUCT ==========
window.saveProduct = async () => {
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

    const uploadedImages = [...galleryImages];

    for (let file of images) {
      const imgRef = ref(storage, `products/${Date.now()}-${file.name}`);
      await uploadBytes(imgRef, file);
      const url = await getDownloadURL(imgRef);
      uploadedImages.push(url);
    }

    showPopup("Saving product...");

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

    const docRef = await addDoc(collection(db, "products"), {
      name,
      description: descInput.value,
      basePrice: Number(price),
salePrice: Number(salePriceInput.value || price),
inStock: stockStatus ? stockStatus.value === "true" : true,
      categoryId,
subCategoryId,
      images: uploadedImages,
      variants: {
        colors,
        sizes
      },
      customOptions,
      paymentSettings,
      relatedDesigns,
      tags: selectedTags,
      isBestseller,
      createdAt: Date.now()
    });

    const newId = docRef.id;

    // ========== BIDIRECTIONAL RELATED DESIGNS ==========
    for (const rid of relatedDesigns) {
      const refDoc = doc(db, "products", rid);
      const snap = await getDoc(refDoc);

      if (snap.exists()) {
        const data = snap.data();
        const arr = data.relatedDesigns || [];

        if (!arr.includes(newId)) {
          arr.push(newId);
          await updateDoc(refDoc, { relatedDesigns: arr });
        }
      }
    }

    showPopup("✅ Product saved");

    setTimeout(() => {
      hidePopup();
      location.href = "products.html";
    }, 1200);

  } catch (e) {
    showPopup("❌ " + e.message);
    console.error(e);
  }
};