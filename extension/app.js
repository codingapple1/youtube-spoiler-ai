
//AI 분석기능 이용하려면 OpenAI API키 입력
const OPENAIAPIKEY = ''

// 빨간 버튼 생성과 클릭시 기능
function createButtonElement(container) {
  let btn = document.createElement('button');
  btn.className = 'yt-hover-btn';
  btn.textContent = '설명';

  Object.assign(btn.style, {
      position: 'absolute',
      bottom: '8px',
      right: '8px',
      backgroundColor: '#ff0000',
      color: 'white',
      border: 'none',
      padding: '6px 10px',
      borderRadius: '4px',
      display: 'none',
      cursor: 'pointer',
  });

  //버튼클릭시 1. 영상 제목, 설명가져옴 2. 그걸로 모달창 생성
  btn.addEventListener('click', async () => {
    if (container.querySelector('.yt-hover-modal')) return;
  
    let url = btn.previousElementSibling.querySelector('a#thumbnail')?.href;
    if (!url) return;
  
    let meta = await fetchVideoMeta(url);
    if (!meta.description) return;
  
    let summary = `제목: ${meta.title} \n설명: ${meta.description}`;
    let modal = createModal(`영상 설명: ${meta.description}`, true, summary);
    container.parentElement.appendChild(modal);
  });

  return btn;
}


// 유튜브 영상마다 버튼추가 (유튜브 홈페이지 & 채널의 동영상탭에서만 작동)
function injectHoverButtons() {
  let videos = document.querySelectorAll('ytd-rich-item-renderer.ytd-rich-grid-renderer');

  videos.forEach((i) => {
      if (i.querySelector('.yt-hover-btn')) return;

      let container = i.querySelector('#content');
      let btn = createButtonElement(container);
      container.appendChild(btn);

      i.addEventListener('mouseenter', () => {
          btn.style.display = 'block';
      });

      i.addEventListener('mouseleave', () => {
          btn.style.display = 'none';
      });
  });
}

  
  // html 동적 변경 감지
let observer = new MutationObserver(() => {
injectHoverButtons();
});
observer.observe(document.body, { childList: true, subtree: true });

// 최초 실행
window.addEventListener('load', () => {
  setTimeout(injectHoverButtons, 1500);
});


//모달 생성, showAIBtn == true면 AI분석 버튼추가
function createModal(text, showAIBtn = null, summary) {
  let modal = document.createElement('div');
  modal.className = 'yt-hover-modal';
  Object.assign(modal.style, {
    backgroundColor: 'white',
    border: '1px solid #eee',
    borderRadius: '5px',
    padding: '12px',
    marginTop: '8px',
    fontSize: '14px',
    position: 'absolute',
    zIndex: '999',
    maxWidth: '300px',
    wordWrap: 'break-word'
  });

  let closeBtn = document.createElement('span');
  closeBtn.textContent = 'x';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '4px',
    right: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  });

  closeBtn.addEventListener('click', () => {
    modal.remove();
  });

  let textNode = document.createElement('div');
  textNode.textContent = text;

  modal.appendChild(textNode);
  modal.appendChild(closeBtn);

  // 특정상황에 AI 분석 버튼 추가기능
  if (showAIBtn) {
    let analyzeBtn = document.createElement('button');
    analyzeBtn.textContent = 'AI 분석';
    Object.assign(analyzeBtn.style, {
      marginTop: '10px',
      padding: '6px 10px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px'
    });

    analyzeBtn.addEventListener('click', async () => {
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = '분석중...';

       // 제목+설명 파라미터로 넣은걸로 GPT에게 물어봄
      let result = await askGPT(summary, OPENAIAPIKEY);
      
      //왜 답변 구조가 매번 랜덤인 것??
      let resultModal = createModal(
        result.output[1]?.content[0]?.text 
        || result.output[0]?.content[0]?.text 
        || '분석 실패 또는 API키 없음');
      modal.parentElement.appendChild(resultModal);

      analyzeBtn.style.display = 'none';
    });

    modal.appendChild(analyzeBtn);
  }

  return modal;
}







// 상세페이지 들어가서 영상 제목, 설명가져오는 함수
async function fetchVideoMeta(videoUrl) {
  const response = await fetch(videoUrl);
  const html = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const title = doc.querySelector('meta[name="title"]')?.content ||
                doc.querySelector('title')?.innerText;

  const description = doc.querySelector('meta[name="description"]')?.content;

  return { title : title, description : description };
}




// AI 검색기능 수행하는 함수, 검색 tool 사용하면 요금 개많이 나옴
async function askGPT(input, myAPIkey) {

  // const response = await fetch("https://api.openai.com/v1/chat/completions", {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${myAPIkey}` 
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      instructions: "유튜브 영상의 제목과 설명을 보고 이게 어떤 영화나 드라마를 다룬 영상인지 검색해서 줄거리를 간략하게 설명해야한다.",
      input: `${input}`,
      tools: [ { type: "web_search_preview" } ]
    })
  });

  let data = await response.json();
  return data
}

