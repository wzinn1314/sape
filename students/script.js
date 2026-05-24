
function openModal(studentId) {
  const modal = document.getElementById('modal' + studentId.charAt(0).toUpperCase() + studentId.slice(1));
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(studentId) {
  const modal = document.getElementById('modal' + studentId.charAt(0).toUpperCase() + studentId.slice(1));
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}


document.addEventListener('click', function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
});


document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const modals = document.querySelectorAll('.modal.active');
    modals.forEach(modal => {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
    });
  }
});


const searchInput = document.getElementById('searchInput');
const gradeFilter = document.getElementById('gradeFilter');
const typeFilter = document.getElementById('typeFilter');
const studentCards = document.querySelectorAll('.student-card');

function filterStudents() {
  const searchTerm = searchInput.value.toLowerCase();
  const selectedGrade = gradeFilter.value;
  const selectedType = typeFilter.value;

  studentCards.forEach(card => {
    let matches = true;

   
    if (searchTerm) {
      const name = card.querySelector('h3').textContent.toLowerCase();
      const matricula = card.querySelector('.matricula').textContent.toLowerCase();
      matches = name.includes(searchTerm) || matricula.includes(searchTerm);
    }

    if (selectedGrade && matches) {
      const grade = card.getAttribute('data-grade');
      matches = grade === selectedGrade;
    }

    
    if (selectedType && matches) {
      const type = card.getAttribute('data-type');
      matches = type === selectedType;
    }

    
    if (matches) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}


searchInput.addEventListener('input', filterStudents);
gradeFilter.addEventListener('change', filterStudents);
typeFilter.addEventListener('change', filterStudents);


window.addEventListener('load', function() {
  studentCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'all 0.3s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 50);
  });
});


const infoButtons = document.querySelectorAll('.info-btn');
infoButtons.forEach(btn => {
  btn.title = 'Ver detalhes completos do aluno';
});
