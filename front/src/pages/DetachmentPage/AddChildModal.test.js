import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import AddChildModal from './AddChildModal';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { getPendingApplications } from '../../services/applications';

jest.mock('../../services/applications', () => ({
    getPendingApplications: jest.fn(async () => ([
        {
            id: 'application-1',
            firstName: 'Маша',
            lastName: 'Иванова',
            gender: 'FEMALE',
            birthDate: '2014-05-01',
            homeCity: 'Новосибирск',
            parentName: 'Елена Иванова',
            relation: 'Мать',
        },
    ])),
    confirmApplication: jest.fn(async () => true),
    rejectApplication: jest.fn(async () => true),
}));

const defaultProps = {
    detachmentId: 'detachment-1',
    campId: 'camp-1',
    childForm: {
        firstName: '',
        lastName: '',
        gender: 'MALE',
        birthDate: '',
    },
    parentUuid: '',
    parentRelation: 'PARENT',
    linkingParent: false,
    onChange: jest.fn(),
    onParentUuidChange: jest.fn(),
    onParentRelationChange: jest.fn(),
    onSubmit: jest.fn((event) => event.preventDefault()),
    onClose: jest.fn(),
    onApplicationConfirmed: jest.fn(),
};

describe('AddChildModal', () => {
    it('loads pending applications after switching to the applications tab', async () => {
        renderWithProviders(<AddChildModal {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: /заявки/i }));

        await waitFor(() => {
            expect(getPendingApplications).toHaveBeenCalledWith('camp-1', '');
        });
        expect(screen.getByRole('button', { name: /заявки/i })).toHaveClass('active');
        expect(screen.getByPlaceholderText('Поиск по имени...')).toBeInTheDocument();
    });
});
