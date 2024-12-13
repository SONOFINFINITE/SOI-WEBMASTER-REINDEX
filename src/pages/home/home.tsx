import classNames from 'classnames';
import styles from './home.module.scss';
import { useState, useEffect } from 'react';
import { yandexWebmaster } from '../../services/yandexWebmaster';

export interface HomeProps {
    className?: string;
}

export const Home = ({ className }: HomeProps) => {
    const [urls, setUrls] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<{ success: string[]; failed: string[]; quotaExceeded: string[] } | null>(null);
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        // Загружаем сохраненный API ключ при монтировании
        const savedApiKey = localStorage.getItem('yandex_api_key');
        if (savedApiKey) {
            setApiKey(savedApiKey);
            yandexWebmaster.setToken(savedApiKey);
        }
    }, []);

    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newApiKey = e.target.value;
        setApiKey(newApiKey);
        localStorage.setItem('yandex_api_key', newApiKey);
        yandexWebmaster.setToken(newApiKey);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiKey) {
            alert('Пожалуйста, введите API ключ');
            return;
        }
        setIsLoading(true);

        try {
            const urlList = urls
                .split('\n')
                .map(url => url.trim())
                .filter(url => url);

            const result = await yandexWebmaster.recrawlUrls(urlList);

            setResults({
                success: result.success,
                failed: result.failed,
                quotaExceeded: result.quotaExceeded || []
            });
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={classNames(className, styles.home__wrapper)}>
            <div className={styles['home__content-container']}>
                <header className={styles.header__wrapper}>
                    <div className={styles.header__logo}></div>
                    <div className={styles['logo__text-container']}>
                        <p className={styles.logo__prefix}>Webmaster&apos;s</p>
                        <h2 className={styles.logo__heading}>Reindex</h2>
                    </div>
                </header>
                <form className={styles['reindex__form-wrapper']} onSubmit={handleSubmit}>
                    <label className={styles['url-input__label']}>
                    <span style={{ marginBottom: '10px' }}>API ключ Яндекс.Вебмастер:</span> 
                        <input
                            type="text"
                            value={apiKey}
                            onChange={handleApiKeyChange}
                            className={styles['reindex__url-input']}
                            style={{ height: '50px' }}
                            placeholder="Введите ваш API ключ"
                        />
                    </label>
                    <label className={styles['url-input__label']}>
                        Пожалуйста, предоставьте перечень ссылок, подлежащих переиндексации в поле ниже:
                        <textarea 
                        value={urls}
                        onChange={(e) => setUrls(e.target.value)}
                        placeholder='https://example.com'
                        className={styles['reindex__url-input']} 
                    />
                    </label>
                   
                    <div className={styles.div1}>
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className={styles.button1}
                        >
                            {isLoading ? 'Обработка...' : 'Начать переиндексацию'}
                        </button>
                    </div>
                </form>

                {results && (
                    <div className={styles['results-container']}>
                        {results.success.length > 0 && (
                            <div className={styles['success-results']}>
                                <h3>Успешно отправлены на переобход:</h3>
                                <ul>
                                    {results.success.map((url, index) => (
                                        <li key={index}>{url}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {results.failed.length > 0 && (
                            <div className={styles['failed-results']}>
                                <h3>Не удалось отправить на переобход:</h3>
                                <ul>
                                    {results.failed.map((url, index) => (
                                        <li key={index}>{url}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {results.quotaExceeded && results.quotaExceeded.length > 0 && (
                            <div className={styles['quota-results']}>
                                <h3>Превышена суточная квота для домена:</h3>
                                <ul>
                                    {results.quotaExceeded.map((url, index) => (
                                        <li key={index}>{url}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
