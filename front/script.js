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
    div.innerHTML = `<strong>${m.name}</strong><br>${m.allergies.join(", ")}`;
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

saveBtn.addEventListener("click", async () => {  // make async
  const name = nameInput.value;
  const allergies = Array.from(document.querySelectorAll(".allergy-list input"))
    .filter(el => el.checked)
    .map(el => el.value);

  const data = { name, allergies };

  addPerson(data);
  modal.style.display = "none";

  await renderMembers(); // await here
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
      const text = await res.text();
      console.error("Server returned error:", text);
      throw new Error("Failed to clear database");
    }

    const result = await res.json();
    console.log(result.message, "Deleted rows:", result.deletedRows);

    // 화면 갱신
    await renderMembers();

  } catch (err) {
    console.error("데이터베이스 초기화 실패:", err);
  }
}