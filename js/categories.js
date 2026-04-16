import { db } from './firebase.js';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const list = document.getElementById("catList");
const input = document.getElementById("catName");
const parentSelect = document.getElementById("parentCategory");

let draggedItem = null;

/* ================= LOAD CATEGORIES ================= */

async function loadCategories() {
  list.innerHTML = "";
  parentSelect.innerHTML = `<option value="">Main Category</option>`;

  const snap = await getDocs(query(
    collection(db, "categories"),
    orderBy("order")
  ));

  const main = [];
  const subs = {};

  snap.forEach(d => {
  const c = { id: d.id, ...d.data() };

  if (!c.parentId) {
    main.push(c);

    if (!subs[c.id]) subs[c.id] = [];

  } else {

    if (!subs[c.parentId]) subs[c.parentId] = [];
    subs[c.parentId].push(c);

  }
});

  /* MAIN CATEGORY DROPDOWN */
  main.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    parentSelect.appendChild(opt);
  });

  /* RENDER LIST */
  main.forEach(c => {
    const li = document.createElement("li");
    li.className = "main-cat";
    li.draggable = true;
    li.dataset.id = c.id;

    li.innerHTML = `
      <div class="row">
        <span class="drag">☰</span>
        <strong>${c.name}</strong>
        <button onclick="del('${c.id}')">❌</button>
      </div>
      <ul class="sub-list"></ul>
    `;

    enableDrag(li);
    list.appendChild(li);

    const subUl = li.querySelector(".sub-list");

    (subs[c.id] || []).forEach(s => {
      const sub = document.createElement("li");
      sub.className = "sub-cat";
      sub.innerHTML = `
        <span>— ${s.name}</span>
        <button onclick="del('${s.id}')">❌</button>
      `;
      subUl.appendChild(sub);
    });
  });
}

/* ================= DRAG ================= */

function enableDrag(li) {
  li.addEventListener("dragstart", () => draggedItem = li);
  li.addEventListener("dragover", e => e.preventDefault());
  li.addEventListener("drop", async () => {
    if (!draggedItem || draggedItem === li) return;

    list.insertBefore(draggedItem, li);

    const updates = [...list.children].map((el, i) =>
      updateDoc(doc(db, "categories", el.dataset.id), { order: i })
    );

    await Promise.all(updates);
  });
}

/* ================= ADD CATEGORY ================= */

window.addCategory = async () => {
  const name = input.value.trim();
  if (!name) return alert("Enter category name");

  const parentId = parentSelect.value || null;

  const snap = await getDocs(
    query(
      collection(db, "categories"),
      where("parentId", "==", parentId)
    )
  );

  await addDoc(collection(db, "categories"), {
    name,
    parentId,
    order: snap.size
  });

  input.value = "";
  parentSelect.value = "";
  loadCategories();
};

/* ================= DELETE ================= */

window.del = async (id) => {
  if (!confirm("Delete this category?")) return;

  /* delete children first */
  const subSnap = await getDocs(
    query(collection(db, "categories"), where("parentId", "==", id))
  );

  for (const d of subSnap.docs) {
    await deleteDoc(doc(db, "categories", d.id));
  }

  await deleteDoc(doc(db, "categories", id));
  loadCategories();
};

/* ================= INIT ================= */

loadCategories();