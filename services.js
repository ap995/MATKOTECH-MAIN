// Shared services list used to populate header dropdown and homepage capabilities
const MATKO_SERVICES = [
  { title: 'Electrical Design', link: 'electrical-design.html', className: 'cap-elec' },
  { title: 'Mechanical Design', link: 'mechanical-design.html', className: 'cap-mech' },
  { title: 'Firmware Design', link: 'firmware-design.html', className: 'cap-firm' },
  { title: 'Software Development', link: 'app-development.html', className: 'cap-app' },
  { title: 'Supply Chain Management', link: 'supply-chain-management.html', className: 'cap-scm' },
  { title: 'Program Management', link: 'program-management.html', className: 'cap-prog' },
  { title: 'Industrial Design', link: 'industrial-design.html', className: 'cap-ind' },
  { title: 'AI Solutions', link: 'index.html', className: 'cap-ai' }
];

function renderServicesDropdown(){
  const menu = document.getElementById('servicesDropdownMenu');
  if(!menu) return;
  menu.innerHTML = '';
  MATKO_SERVICES.forEach(s => {
    const a = document.createElement('a');
    a.href = s.link || '#';
    a.textContent = s.title;
    menu.appendChild(a);
  });
}

function renderCapabilitiesGrid(){
  const grid = document.getElementById('capabilitiesGrid');
  if(!grid) return;
  grid.innerHTML = '';
  MATKO_SERVICES.forEach(s => {
    const card = document.createElement('div');
    card.className = 'capability-card ' + (s.className || '');
    const h = document.createElement('h3');
    h.className = 'capability-title';
    h.textContent = s.title;
    card.appendChild(h);
    const wrapper = document.createElement('a');
    wrapper.href = s.link || '#';
    wrapper.style.textDecoration = 'none';
    wrapper.style.color = 'inherit';
    wrapper.appendChild(card);
    grid.appendChild(wrapper);
  });
}

function initSharedServices(){
  renderServicesDropdown();
  renderCapabilitiesGrid();

  // Accessibility: toggle aria-expanded on dropdown toggle when clicked
  const ddToggle = document.getElementById('servicesDropdown');
  const ddRoot = ddToggle && ddToggle.closest('.dropdown');
  if(ddToggle && ddRoot){
    ddToggle.addEventListener('click', (e)=>{
      e.stopPropagation();
      const expanded = ddToggle.getAttribute('aria-expanded') === 'true';
      ddToggle.setAttribute('aria-expanded', String(!expanded));
      ddRoot.classList.toggle('show');
    });
    document.addEventListener('click', (e)=>{ if(!ddRoot.contains(e.target)){ ddRoot.classList.remove('show'); ddToggle.setAttribute('aria-expanded','false'); } });
  }
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initSharedServices);
} else {
  initSharedServices();
}
