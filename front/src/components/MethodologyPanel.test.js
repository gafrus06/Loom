import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import MethodologyPanel from './MethodologyPanel';
import { renderWithProviders } from '../test-utils/renderWithProviders';
import { methodologyAPI } from '../services/methodology';

jest.mock('../services/methodology', () => ({
    methodologyAPI: {
        getGames: jest.fn(async () => ([
            {
                id: 'game-1',
                title: 'Ледокол',
                description: 'Игра на знакомство',
                duration: '15 минут',
                players: '10-20',
                purpose: 'Познакомить детей',
                materials: 'Мяч',
                isUsed: false,
            },
        ])),
        getCampfires: jest.fn(async () => []),
        getExercises: jest.fn(async () => ([
            {
                id: 'exercise-7',
                title: 'Разминка',
                description: 'Активное упражнение',
                duration: '10 минут',
                difficulty: 'Лёгкая',
                effect: 'Снимает напряжение',
                isUsed: false,
            },
        ])),
        getPhysiologicalFeatures: jest.fn(async () => []),
        getRecommendedForStage: jest.fn(async () => ([
            {
                id: 'exercise-7',
                type: 'exercise',
                title: 'Разминка',
            },
        ])),
        getFavorites: jest.fn(async () => []),
        addToFavorites: jest.fn(async () => true),
        removeFromFavorites: jest.fn(async () => true),
        markAsUsed: jest.fn(async () => ({ ok: true })),
    },
}));

describe('MethodologyPanel', () => {
    it('switches tabs and keeps critical actions available', async () => {
        renderWithProviders(
            <MethodologyPanel
                detachmentId="detachment-1"
                currentStage="BUSINESS"
                ageGroup="12-14"
            />,
        );

        await waitFor(() => {
            expect(methodologyAPI.getGames).toHaveBeenCalledWith('detachment-1', 'BUSINESS');
            expect(methodologyAPI.getRecommendedForStage).toHaveBeenCalledWith('detachment-1', 'BUSINESS');
        });

        fireEvent.click(screen.getByRole('button', { name: /упражнения/i }));

        await waitFor(() => {
            expect(methodologyAPI.getExercises).toHaveBeenCalledWith('detachment-1', 'BUSINESS');
        });

        expect(screen.getByRole('button', { name: /упражнения/i })).toHaveClass('active');
    });
});
