(function () {
  if (!window.CMS) return;

  CMS.registerPreviewStyle('/admin/preview.css');

  const h = window.h;
  const createClass = window.createClass;
  if (!h || !createClass) return;

  const getValue = (entry, path, fallback = '') => {
    const value = entry.getIn(['data'].concat(path));
    if (value === undefined || value === null) return fallback;
    return value;
  };

  const getAssetUrl = (props, value) => {
    if (!value) return '';
    const asset = props.getAsset(value);
    const src = asset && asset.toString ? asset.toString() : value;
    return getOptimizedAssetUrl(src);
  };

  const getOptimizedAssetUrl = (src) => {
    if (!src || /^(https?:)?\/\//.test(src) || src.startsWith('data:')) return src;
    const cleanSrc = src.split(/[?#]/)[0];
    const hasLeadingSlash = cleanSrc.startsWith('/');
    const normalizedSrc = cleanSrc.replace(/^\/+/, '');
    const match = normalizedSrc.match(/^assets\/img\/(.+)\.(jpe?g|png|webp)$/i);
    if (!match || normalizedSrc.startsWith('assets/img/generated/')) return src;
    return `${hasLeadingSlash ? '/' : ''}assets/img/generated/${match[1]}.webp`;
  };

  const listToArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (value.toJS) return value.toJS();
    return [];
  };

  const text = (value, fallback = '') => value || fallback;
  const richText = (value, fallback = 'Пока не заполнено.') => String(value || fallback)
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  const tierLabels = {
    deluxe: 'Deluxe',
    premium: 'Premium',
    business: 'Business'
  };

  const hero = (props, entry, type) => {
    const cover = getAssetUrl(props, getValue(entry, ['cover']));
    const title = getValue(entry, ['title'], 'Без названия');
    const subtitle = getValue(entry, ['subtitle']);

    return h('div', { className: 'ec-preview-hero' },
      cover ? h('img', { src: cover, alt: title }) : null,
      h('div', { className: 'ec-preview-hero-copy' },
        h('span', { className: 'ec-preview-kicker' }, type),
        h('h1', {}, title),
        subtitle ? h('p', { className: 'ec-preview-subtitle' }, subtitle) : null
      )
    );
  };

  const meta = (items) => h('ul', { className: 'ec-preview-meta' },
    items.filter(Boolean).map((item) => h('li', {}, item))
  );

  const imageCard = (props, label, value, className = '') => {
    const src = getAssetUrl(props, value);
    return h('div', { className: `ec-preview-image-card ${className}`.trim() },
      src ? h('img', { src, alt: label }) : h('div', { className: 'ec-preview-image-missing' }, 'Фото не выбрано'),
      h('span', {}, label)
    );
  };

  const imageGroup = (title, items) => h('section', { className: 'ec-preview-image-section' },
    h('h2', {}, title),
    h('div', { className: 'ec-preview-image-grid' }, items)
  );

  const textPanel = (title, body, kicker = '') => h('section', { className: 'ec-preview-panel' },
    kicker ? h('span', { className: 'ec-preview-kicker' }, kicker) : null,
    h('h2', {}, title),
    richText(body).map((paragraph) => h('p', {}, paragraph))
  );

  const linkList = (items) => {
    const links = listToArray(items).filter((item) => item && item.label);
    if (!links.length) return h('p', { className: 'ec-preview-empty' }, 'Ссылки пока не добавлены.');
    return h('ul', { className: 'ec-preview-list' },
      links.map((item) => h('li', {},
        h('b', {}, item.label),
        h('span', {}, item.url || item.file || 'Ссылка не указана')
      ))
    );
  };

  const gallery = (props, items, title) => {
    const images = listToArray(items)
      .map((item) => getAssetUrl(props, item && (item.image || item)))
      .filter(Boolean)
      .slice(0, 8);

    if (!images.length) return h('p', { className: 'ec-preview-empty' }, 'Фотографии пока не добавлены.');

    return h('div', { className: 'ec-preview-gallery' },
      images.map((src) => h('img', { src, alt: title || '' }))
    );
  };

  const HomeImagesPreview = createClass({
    render() {
      const entry = this.props.entry;
      const hasImages = getValue(entry, ['hero']) || getValue(entry, ['overview']) || getValue(entry, ['directions']);
      const hasHomeText = getValue(entry, ['title']) || getValue(entry, ['lead']) || getValue(entry, ['secondary']);
      const hasSiteSettings = getValue(entry, ['footerText']) || getValue(entry, ['legalInfo']) || getValue(entry, ['messengers']) || getValue(entry, ['legalLinks']);

      if (hasHomeText && !hasImages) {
        return h('article', { className: 'ec-preview ec-preview-text-page' },
          h('div', { className: 'ec-preview-settings-head' },
            h('span', { className: 'ec-preview-kicker' }, 'Основной текст'),
            h('h1', {}, text(getValue(entry, ['title']), 'EvolveClub')),
            getValue(entry, ['eyebrow']) ? h('p', { className: 'ec-preview-subtitle' }, getValue(entry, ['eyebrow'])) : null
          ),
          textPanel('Первый абзац', getValue(entry, ['lead'])),
          textPanel('Второй абзац', getValue(entry, ['secondary']), 'Необязательно'),
          h('div', { className: 'ec-preview-action-row' },
            h('span', {}, `Кнопка: ${text(getValue(entry, ['buttonText']), 'не указана')}`),
            h('span', {}, `Ссылка: ${text(getValue(entry, ['buttonLink']), 'не указана')}`)
          )
        );
      }

      if (hasSiteSettings && !hasImages) {
        return h('article', { className: 'ec-preview ec-preview-text-page' },
          h('div', { className: 'ec-preview-settings-head' },
            h('span', { className: 'ec-preview-kicker' }, 'Контакты, соцсети и документы'),
            h('h1', {}, 'Футер и документы'),
            h('p', { className: 'ec-preview-subtitle' }, 'Проверьте реквизиты, ссылки на документы и кнопки мессенджеров.')
          ),
          textPanel('Текст в футере', getValue(entry, ['footerText'])),
          h('section', { className: 'ec-preview-panel' },
            h('h2', {}, 'Реквизиты'),
            h('div', { className: 'ec-preview-action-row' },
              h('span', {}, `НПД: ${text(getValue(entry, ['legalInfo', 'npd']), 'не указано')}`),
              h('span', {}, `ИНН: ${text(getValue(entry, ['legalInfo', 'inn']), 'не указано')}`),
              h('span', {}, `Моб.: ${text(getValue(entry, ['legalInfo', 'mobile']), 'не указано')}`)
            )
          ),
          h('section', { className: 'ec-preview-panel' },
            h('h2', {}, 'Мессенджеры'),
            linkList(getValue(entry, ['messengers']))
          ),
          h('section', { className: 'ec-preview-panel' },
            h('h2', {}, 'Юридические документы'),
            linkList(getValue(entry, ['legalLinks']))
          )
        );
      }

      const overview = [
        imageCard(this.props, 'Европа', getValue(entry, ['overview', 'europe'])),
        imageCard(this.props, 'Россия и СНГ', getValue(entry, ['overview', 'russiaCis'])),
        imageCard(this.props, 'Азия и Восток', getValue(entry, ['overview', 'asiaEast'])),
        imageCard(this.props, 'Африка', getValue(entry, ['overview', 'africa'])),
        imageCard(this.props, 'Америка и Карибы', getValue(entry, ['overview', 'americaCaribbean'])),
        imageCard(this.props, 'Острова', getValue(entry, ['overview', 'islands'])),
        imageCard(this.props, 'Австралия и Океания', getValue(entry, ['overview', 'oceania'])),
      ];
      const directions = [
        imageCard(this.props, 'Фон: Европа', getValue(entry, ['directions', 'europeBg'])),
        imageCard(this.props, 'Фон: Россия и СНГ', getValue(entry, ['directions', 'russiaCisBg'])),
        imageCard(this.props, 'Фон: Азия и Восток', getValue(entry, ['directions', 'asiaEastBg'])),
        imageCard(this.props, 'Фон: Африка', getValue(entry, ['directions', 'africaBg'])),
        imageCard(this.props, 'Фон: Америка и Карибы', getValue(entry, ['directions', 'americaCaribbeanBg'])),
        imageCard(this.props, 'Фон: Острова', getValue(entry, ['directions', 'islandsBg'])),
        imageCard(this.props, 'Фон: Австралия и Океания', getValue(entry, ['directions', 'oceaniaBg'])),
      ];

      return h('article', { className: 'ec-preview ec-preview-settings' },
        h('div', { className: 'ec-preview-settings-head' },
          h('span', { className: 'ec-preview-kicker' }, 'Изображения на главной странице'),
          h('h1', {}, 'Изображения сайта'),
          h('p', { className: 'ec-preview-subtitle' }, 'Компактный предпросмотр показывает, какие фото сейчас назначены для главной страницы и разделов направлений.')
        ),
        imageGroup('Главный фон', [
          imageCard(this.props, 'Главный фон первого экрана', getValue(entry, ['hero']), 'ec-preview-image-wide')
        ]),
        imageGroup('Карточки обзора направлений', overview),
        imageGroup('Фоны разделов направлений', directions),
        imageGroup('Форма запроса', [
          imageCard(this.props, 'Фон формы запроса', getValue(entry, ['request']), 'ec-preview-image-wide')
        ])
      );
    }
  });

  const GuidePreview = createClass({
    render() {
      return h('article', { className: 'ec-preview ec-preview-text-page' },
        h('div', { className: 'ec-preview-settings-head' },
          h('span', { className: 'ec-preview-kicker' }, 'Инструкция'),
          h('h1', {}, 'Работа с сайтом'),
          h('p', { className: 'ec-preview-subtitle' }, 'Эта инструкция доступна в админке и помогает заказчику заполнять сайт без обращения к коду.')
        ),
        h('section', { className: 'ec-preview-body ec-preview-guide-body' }, this.props.widgetFor('body'))
      );
    }
  });

  const CountryPreview = createClass({
    render() {
      const entry = this.props.entry;
      const body = this.props.widgetFor('body');
      return h('article', { className: 'ec-preview' },
        hero(this.props, entry, 'Направление'),
        meta([
          `Регион: ${text(getValue(entry, ['region']), 'не выбран')}`,
          getValue(entry, ['published']) === false ? 'Черновик' : 'Опубликовано',
          getValue(entry, ['featured']) === false ? 'Не на главной' : 'На главной'
        ]),
        h('section', { className: 'ec-preview-body' }, body),
        getValue(entry, ['why_body']) ? h('section', {},
          h('h2', {}, text(getValue(entry, ['why_title']), 'Зачем ехать?')),
          h('div', { className: 'ec-preview-body' }, this.props.widgetFor('why_body'))
        ) : null,
        getValue(entry, ['details_body']) ? h('section', {},
          h('h2', {}, text(getValue(entry, ['details_title']), 'Подробнее')),
          h('div', { className: 'ec-preview-body' }, this.props.widgetFor('details_body'))
        ) : null
      );
    }
  });

  const HotelPreview = createClass({
    render() {
      const entry = this.props.entry;
      const rooms = listToArray(getValue(entry, ['rooms']));
      const tier = getValue(entry, ['tier']);
      return h('article', { className: 'ec-preview' },
        hero(this.props, entry, 'Отель'),
        meta([
          `Страна: ${text(getValue(entry, ['country']), 'не выбрана')}`,
          `Сегмент: ${tierLabels[tier] || tier || 'не выбран'}`,
          `Звезды: ${text(getValue(entry, ['stars']), 'не указаны')}`,
          `Расположение: ${text(getValue(entry, ['location']), 'не указано')}`,
          getValue(entry, ['published']) === false ? 'Черновик' : 'Опубликовано'
        ]),
        h('section', { className: 'ec-preview-body' }, this.props.widgetFor('body')),
        h('h2', {}, 'Номера, сьюты и виллы'),
        rooms.length ? h('div', { className: 'ec-preview-grid' },
          rooms.slice(0, 6).map((room) => h('div', { className: 'ec-preview-card' },
            h('span', { className: 'ec-preview-label' }, room.type || room.area || 'Вариант размещения'),
            h('h3', {}, room.title || 'Без названия'),
            room.description ? h('p', {}, room.description) : null
          ))
        ) : h('p', { className: 'ec-preview-empty' }, 'Номера и виллы пока не добавлены.'),
        h('h2', {}, 'Галерея'),
        gallery(this.props, getValue(entry, ['gallery']), getValue(entry, ['title']))
      );
    }
  });

  const TourPreview = createClass({
    render() {
      const entry = this.props.entry;
      const facts = listToArray(getValue(entry, ['hero_facts']));
      const days = listToArray(getValue(entry, ['days']));
      return h('article', { className: 'ec-preview' },
        hero(this.props, entry, 'Тур'),
        meta([
          text(getValue(entry, ['destination']), 'Направление не выбрано'),
          text(getValue(entry, ['duration']), 'Длительность не указана'),
          getValue(entry, ['published']) === false ? 'Черновик' : 'Опубликовано'
        ]),
        facts.length ? h('div', { className: 'ec-preview-grid' },
          facts.map((fact) => h('div', { className: 'ec-preview-card' },
            h('span', { className: 'ec-preview-label' }, fact.label || 'Факт'),
            h('p', {}, fact.text || '')
          ))
        ) : null,
        h('section', { className: 'ec-preview-body' }, this.props.widgetFor('body')),
        h('h2', {}, 'Программа'),
        days.length ? h('div', { className: 'ec-preview-grid' },
          days.slice(0, 8).map((day) => h('div', { className: 'ec-preview-card' },
            h('h3', {}, day.title || 'День'),
            day.description ? h('p', {}, day.description) : null
          ))
        ) : h('p', { className: 'ec-preview-empty' }, 'Программа пока не добавлена.'),
        h('h2', {}, 'Галерея'),
        gallery(this.props, getValue(entry, ['gallery']), getValue(entry, ['title']))
      );
    }
  });

  CMS.registerPreviewTemplate('settings', HomeImagesPreview);
  CMS.registerPreviewTemplate('guide', GuidePreview);
  CMS.registerPreviewTemplate('countries', CountryPreview);
  CMS.registerPreviewTemplate('hotels', HotelPreview);
  CMS.registerPreviewTemplate('tours', TourPreview);
})();
