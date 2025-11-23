let members = [];
let editingIndex = null;

const modal = document.getElementById("memberModal");
const addMemberBtn = document.getElementById("addMemberBtn");
const closeModal = document.getElementById("closeModal");
const saveBtn = document.getElementById("saveMember");
const cancelBtn = document.getElementById("cancelMember");
const nameInput = document.getElementById("nameInput");
const clearBtn = document.getElementById("clearBtn");

window.addEventListener("DOMContentLoaded", async () => {
    await renderMembers();
    await updateTabData(); // wait until foods and allergies tab content are ready

    // Show content for the active tab
    const activeButton = document.querySelector('.tab-button.active');
    if (activeButton) {
        const tabName = activeButton.getAttribute('data-tab');
        tabContent.innerHTML = tabData[tabName] || "No content.";
    }
});

addMemberBtn.addEventListener("click", () => {
  editingIndex = null;
  openModal();
});

clearBtn.addEventListener("click", () => {
  clearDatabase();
});

closeModal.addEventListener("click", () => modal.style.display = "none");
cancelBtn.addEventListener("click", () => modal.style.display = "none");

function openModal(memberData = null) {
  modal.style.display = "flex";
  nameInput.value = memberData?.name || "";

  document.querySelectorAll(".allergy-list input").forEach(chk => {
    chk.checked = memberData?.allergies?.includes(chk.value) || false;
  });
}

async function renderMembers() {
  const container = document.getElementById("member-container");
  container.innerHTML = "";

  if (editingIndex == null) {
    members = await loadMembers();
  }

  members.forEach((m, i) => {
    const div = document.createElement("div");
    div.classList.add("member-card");
    if (m.name == "") {
      div.innerHTML = `<div id="member-name-container"><strong class="member-name">Someone</strong></div><br>
     <div id="member-allergies-container"><span class="member-allergy">${m.allergies.join(", ")}</span></div>`;
    } else if (m.allergies == "") {
      div.innerHTML = `<div id="member-name-container"><strong class="member-name">${m.name}</strong></div>`;
    } else {
      div.innerHTML = `<div id="member-name-container"><strong class="member-name">${m.name}</strong></div><br>
      <div id="member-allergies-container"><span class="member-allergy">${m.allergies.join(", ")}</span></div>`;
    }
    div.onclick = () => {
      editingIndex = i;
      openModal(m);
    };
    container.appendChild(div);
  });
}

async function addPerson(data) {
  
  try {
    const res = await fetch("/addPerson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data) // JSON 문자열로 변환
    });

    // 서버가 200 OK를 반환하지 않으면 에러 처리
    if (!res.ok) {
      const text = await res.text(); // 서버가 반환한 내용을 확인
      console.error("Server returned error:", text);
      throw new Error("Server save failed");
    }
    const result = await res.json();

    console.log("DB 저장 완료:", result);
  } catch (err) {
    console.error("Server save failed:", err);
  }
}

saveBtn.addEventListener("click", async () => {
  const name = nameInput.value;
  const allergies = Array.from(document.querySelectorAll(".allergy-list input"))
    .filter(el => el.checked)
    .map(el => el.value);

  const data = { name, allergies };

  await addPerson(data);
  modal.style.display = "none";

  await renderMembers();
  await updateActiveTab();
});

async function loadMembers() {
  try {
    const res = await fetch("/people");
    if (!res.ok) throw new Error("Failed to fetch people");

    let dataList = [];
    const people = await res.json();
    people.forEach((row) => {
      const name = row["name"];
      const allergies = row["allergies"];
      const data = { name, allergies };
      dataList.push(data);
    });
    return dataList;

  } catch (err) {
    console.error("데이터 불러오기 실패:", err);
    return []; // return empty array on failure
  }
}

async function clearDatabase() {
  try {
    const res = await fetch("/clearPeople", {
      method: "DELETE",
    });

    if (!res.ok) {
      const text = await res.text(); // If server returns HTML or error text
      console.error("Server returned error:", text);
      throw new Error("Failed to clear database");
    }

    const result = await res.json();
    console.log(result.message, "Deleted rows:", result.deletedRows);

    // Refresh the members list from the database
    await renderMembers();
    await updateActiveTab()
  } catch (err) {
    console.error("데이터베이스 초기화 실패:", err);
  }
}

/* Right Panel */

// Select all tab buttons and the tab content container
const tabButtons = document.querySelectorAll('.tab-button');
const tabContent = document.getElementById('tab-content');

async function updateActiveTab() {
    await updateTabData();

    const activeButton = document.querySelector('.tab-button.active');
    if (!activeButton) return;

    const tabName = activeButton.getAttribute('data-tab');
    tabContent.innerHTML = tabData[tabName] || "No content.";
}

async function getAllergyList() {
  const peopleList = await loadMembers();

  let allergyList = [];

  peopleList.forEach(row => {
      allergyList.push(...row.allergies);
  });

  let uniqueAllergies = [...new Set(allergyList)];

  return uniqueAllergies;
}

async function renderAllergiesTab() {
    const allergiesList = await getAllergyList();

    if (allergiesList.length === 0) {   // check if array is empty
        return "<p>No Allergies</p>";
    }

    return `
        <div class="current_allergy_container">
            ${allergiesList.map(a => `
                <div class="current_allergy_item">${a}</div>
            `).join("")}
        </div>
    `;
}

async function renderFoodsTab() {
    const allergiesList = await getAllergyList();
    const foodJson = await fetchJSONData("foods.json");

    if (!foodJson) {
        console.error("Could not load foods.json");
        return "<p>Food list unavailable.</p>";
    }

    let safeFoods = [];

    Object.keys(foodJson).forEach(foodName => {
        const ingredientList = foodJson[foodName].ingredients;

        // Check if any ingredient matches allergies
        const hasConflict = ingredientList.some(ing =>
            allergiesList.includes(ing)
        );

        if (hasConflict) return;  // skip unsafe food (same as continue)

        safeFoods.push({
            name: foodName,
            image: foodJson[foodName].image_url,
            ingredients: ingredientList
        });
    });

    if (safeFoods.length === 0) {
        return "<p>No safe foods available.</p>";
    }

    // Render with your CSS card layout
    return `
        <div class="food-list">
            ${safeFoods
                .map(
                    f => `
                    <div class="food-card">
                        <img src="${f.image}" class="food-image">
                        <div class="food-info">
                            <strong>${f.name}</strong>
                            <div class="food-allergy-text">
                                Ingredients: ${f.ingredients.join(", ")}
                            </div>
                        </div>
                    </div>
                    `
                )
                .join("")}
        </div>
    `;
}

// Sample content for each tab
let tabData = {
    foods: `Food List is empty`,
    allergies: "No Allergies!"
}

async function updateTabData() {
  tabData = {
    foods: await renderFoodsTab(),
    allergies: await renderAllergiesTab()
  }; 
}

// Function to switch tabs
tabButtons.forEach(async (button) => {
    await updateTabData(); // if you want to update tab data first

    button.addEventListener('click', async () => {  // make inner function async if needed
        // Remove 'active' class from all buttons
        tabButtons.forEach(btn => btn.classList.remove('active'));

        // Add 'active' class to the clicked button
        button.classList.add('active');

        // Get the tab name from data-tab attribute
        const tabName = button.getAttribute('data-tab');

        // Update tab content
        tabContent.innerHTML = tabData[tabName] || "No Allergies!";
    });
});

async function fetchJSONData(filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json(); // Parses the JSON response into a JavaScript object
    console.log(data); // Work with the JSON data
    return data;
  } catch (error) {
    console.error('Failed to fetch JSON data:', error);
  }
}

const allergySearch = document.getElementById("allergySearch");
const allergyListContainer = document.querySelector(".allergy-list");

allergySearch.addEventListener("input", () => {
    allergyListContainer.innerHTML = updateAllergyListPopup(allergySearch.value);
});

const allergies = [
      "Additives", "Apple", "Avocado", "Banana", "Beef", "Bell pepper",
      "Blueberry", "Carrot", "Celery", "Chia seeds", "Chicken", "Chili powder",
      "Cinnamon", "Citrus fruits", "Cocoa", "Coconut", "Corn", "Coriander",
      "Curry powder", "Dairy", "Eggs", "Fish", "Flaxseed", "Garlic", "Ginger",
      "Gluten", "Grapes", "Kiwi", "Latex-fruit cross allergens", "Legumes",
      "Mango", "Melon", "Mushroom", "Mustard", "Nutmeg", "Onion", "Papaya",
      "Paprika", "Peach", "Peanut", "Pineapple", "Plum", "Poppy seeds", "Pork",
      "Potato", "Preservatives", "Pumpkin seeds", "Raspberry", "Red pepper",
      "Rice", "Sesame", "Shellfish", "Soy", "Spinach", "Strawberry",
      "Sunflower seeds", "Tomato", "Tree Nuts", "Turkey", "Turmeric", "Wheat"
];

function updateAllergyListPopup(searchKeyword = "") {

    // Lowercase the keyword for case-insensitive search
    const keyword = searchKeyword.toLowerCase();

    // Filter the allergies based on the keyword
    const filtered = allergies.filter(a => a.toLowerCase().includes(keyword));

    // Return HTML string with <label><input> ... </label><br>
    return filtered.map(a => `<label><input type="checkbox" value="${a}"> ${a}</label><br>`).join("");
}