import "./ConsentDocuments.css";

const DEMO_NOTICE = "Текст документа является демонстрационным и должен быть доработан перед реальным запуском сервиса.";

function ConsentDocumentPage({ title, children }) {
    return (
        <main className="consent-document-page">
            <section className="consent-document">
                <h1>{title}</h1>
                <p>{children}</p>
                <p className="consent-document__notice">{DEMO_NOTICE}</p>
            </section>
        </main>
    );
}

export function PrivacyPolicyPage() {
    return (
        <ConsentDocumentPage title="Политика обработки персональных данных">
            Здесь будет размещена информация о том, какие персональные данные обрабатываются сервисом, для каких целей они используются и как пользователь может получить сведения об обработке.
        </ConsentDocumentPage>
    );
}

export function UserPersonalDataConsentPage() {
    return (
        <ConsentDocumentPage title="Согласие на обработку персональных данных пользователя">
            Здесь будет размещён текст согласия пользователя на обработку персональных данных при регистрации и использовании сервиса детского оздоровительного лагеря.
        </ConsentDocumentPage>
    );
}

export function ParentPersonalDataConsentPage() {
    return (
        <ConsentDocumentPage title="Согласие на обработку персональных данных родителя">
            Здесь будет размещён текст согласия родителя или законного представителя на обработку данных, необходимых для подачи заявки и связи с представителями лагеря.
        </ConsentDocumentPage>
    );
}

export function ChildPersonalDataConsentPage() {
    return (
        <ConsentDocumentPage title="Согласие на обработку персональных данных ребёнка">
            Здесь будет размещён текст согласия законного представителя на обработку данных ребёнка для оформления заявки и организации пребывания в лагере.
        </ConsentDocumentPage>
    );
}

export function ChildHealthDataConsentPage() {
    return (
        <ConsentDocumentPage title="Согласие на обработку сведений о здоровье ребёнка">
            Здесь будет размещён текст согласия на обработку сведений о здоровье ребёнка, которые нужны для безопасности и корректной организации пребывания в лагере.
        </ConsentDocumentPage>
    );
}

export function PhotoVideoPublicationConsentPage() {
    return (
        <ConsentDocumentPage title="Согласие на публикацию фото и видео">
            Здесь будет размещён текст согласия на публикацию фото- и видеоматериалов с участием ребёнка в новостной ленте лагеря.
        </ConsentDocumentPage>
    );
}
